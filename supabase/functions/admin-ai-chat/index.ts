import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, admin_role")
      .eq("user_id", user.id)
      .single();

    if (!roles || (roles.role !== "admin" && !roles.admin_role)) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, executeAction } = await req.json();

    // If executing an approved action
    if (executeAction) {
      return await handleActionExecution(supabase, user.id, executeAction);
    }

    // System prompt for VibeOps
    const systemPrompt = `You are VibeOps, an AI assistant for Vibe Check moderation and community operations.

Your role:
- Help moderators identify and handle incidents
- Provide context about rooms, users, and patterns
- Propose moderation actions (warn, mute, suspend, ban)
- Draft messages to users
- Summarize activity

CRITICAL RULES:
- For ANY action that modifies data (takeAction, message), you MUST use the corresponding tool
- Read-only operations (listIncidents, summarize) can be used directly
- Always explain your reasoning clearly
- Be empathetic but firm on safety issues
- Prioritize user safety and community guidelines

Available tools:
- mod_listIncidents: Query incidents by status, severity, category, dateRange, roomId
- mod_takeAction: Propose moderation action (warn/mute/suspend/ban) - REQUIRES APPROVAL
- mod_message: Propose message to send to user - REQUIRES APPROVAL  
- rooms_summarize: Get summary of room activity - READ ONLY

When proposing actions, provide:
1. Clear explanation of the issue
2. Specific evidence (incident IDs, message content)
3. Recommended action and duration
4. Expected outcome`;

    // Call Lovable AI with tool calling
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "mod_listIncidents",
              description: "List and filter moderation incidents",
              parameters: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["open", "investigating", "resolved", "dismissed"],
                    description: "Filter by incident status",
                  },
                  severity: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                    description: "Filter by severity level",
                  },
                  category: {
                    type: "string",
                    enum: ["harassment", "spam", "self_harm", "sexual_content", "hate_speech", "other"],
                    description: "Filter by incident category",
                  },
                  roomId: {
                    type: "string",
                    description: "Filter by specific room ID",
                  },
                  limit: {
                    type: "number",
                    description: "Maximum results to return",
                    default: 20,
                  },
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "mod_takeAction",
              description: "Propose a moderation action against a user (requires approval)",
              parameters: {
                type: "object",
                properties: {
                  userId: {
                    type: "string",
                    description: "Target user ID",
                  },
                  messageId: {
                    type: "string",
                    description: "Related message ID if applicable",
                  },
                  action: {
                    type: "string",
                    enum: ["warn", "mute", "suspend", "ban"],
                    description: "Type of moderation action",
                  },
                  reason: {
                    type: "string",
                    description: "Clear explanation for the action",
                  },
                  durationHours: {
                    type: "number",
                    description: "Duration in hours for mute/suspend actions",
                  },
                },
                required: ["userId", "action", "reason"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "mod_message",
              description: "Propose a message to send to a user (requires approval)",
              parameters: {
                type: "object",
                properties: {
                  userId: {
                    type: "string",
                    description: "User to message",
                  },
                  message: {
                    type: "string",
                    description: "Message content",
                  },
                  templateId: {
                    type: "string",
                    description: "Optional template ID",
                  },
                },
                required: ["userId", "message"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "rooms_summarize",
              description: "Get summary of room activity (read-only)",
              parameters: {
                type: "object",
                properties: {
                  roomId: {
                    type: "string",
                    description: "Room ID to summarize",
                  },
                  window: {
                    type: "string",
                    enum: ["24h", "7d", "30d"],
                    description: "Time window for summary",
                    default: "24h",
                  },
                },
                required: ["roomId"],
              },
            },
          },
        ],
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices[0];

    // If AI wants to use tools
    if (choice.message.tool_calls) {
      const toolResults = [];

      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`Tool called: ${toolName}`, toolArgs);

        // Execute tool and log to audit
        const result = await executeTool(supabase, user.id, toolName, toolArgs);
        toolResults.push({
          toolCallId: toolCall.id,
          toolName,
          result,
        });

        // Log to audit
        await logAudit(supabase, user.id, toolName, toolArgs, result);
      }

      return new Response(JSON.stringify({
        message: choice.message.content,
        toolResults,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Simple text response
    return new Response(JSON.stringify({
      message: choice.message.content,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Admin AI chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Execute moderation tools
async function executeTool(supabase: any, userId: string, toolName: string, args: any) {
  switch (toolName) {
    case "mod_listIncidents":
      return await listIncidents(supabase, args);
    
    case "mod_takeAction":
      return await proposeAction(supabase, userId, args);
    
    case "mod_message":
      return await proposeMessage(supabase, userId, args);
    
    case "rooms_summarize":
      return await summarizeRoom(supabase, args);
    
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// List incidents (read-only)
async function listIncidents(supabase: any, args: any) {
  let query = supabase
    .from("incidents")
    .select(`
      *,
      profiles!incidents_user_id_fkey(username, age_group),
      chat_rooms(name),
      chat_messages(message)
    `)
    .order("created_at", { ascending: false })
    .limit(args.limit || 20);

  if (args.status) query = query.eq("status", args.status);
  if (args.severity) query = query.eq("severity", args.severity);
  if (args.category) query = query.eq("category", args.category);
  if (args.roomId) query = query.eq("room_id", args.roomId);

  const { data, error } = await query;

  if (error) {
    console.error("Error listing incidents:", error);
    return { error: error.message };
  }

  // Redact PII in message content
  const redactedData = data.map((incident: any) => ({
    ...incident,
    chat_messages: incident.chat_messages ? {
      message: "[REDACTED - View in admin panel]",
      _hasContent: true,
    } : null,
  }));

  return { incidents: redactedData, count: data.length };
}

// Propose moderation action (returns plan for approval)
async function proposeAction(supabase: any, moderatorId: string, args: any) {
  // Get user details
  const { data: targetUser } = await supabase
    .from("profiles")
    .select("username, age_group")
    .eq("id", args.userId)
    .single();

  return {
    requiresApproval: true,
    actionType: "moderation",
    plan: {
      action: args.action,
      targetUserId: args.userId,
      targetUsername: targetUser?.username || "Unknown",
      messageId: args.messageId,
      reason: args.reason,
      durationHours: args.durationHours,
      expiresAt: args.durationHours 
        ? new Date(Date.now() + args.durationHours * 60 * 60 * 1000).toISOString()
        : null,
    },
    auditData: {
      tool: "mod_takeAction",
      input: args,
      action: "propose",
      target: args.userId,
    },
  };
}

// Propose message to user (returns plan for approval)
async function proposeMessage(supabase: any, moderatorId: string, args: any) {
  const { data: targetUser } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", args.userId)
    .single();

  return {
    requiresApproval: true,
    actionType: "message",
    plan: {
      targetUserId: args.userId,
      targetUsername: targetUser?.username || "Unknown",
      message: args.message,
      templateId: args.templateId,
    },
    auditData: {
      tool: "mod_message",
      input: args,
      action: "propose",
      target: args.userId,
    },
  };
}

// Summarize room activity (read-only)
async function summarizeRoom(supabase: any, args: any) {
  const windowHours = args.window === "7d" ? 168 : args.window === "30d" ? 720 : 24;
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, created_at, user_id")
    .eq("room_id", args.roomId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("name, focus_area, age_group")
    .eq("id", args.roomId)
    .single();

  const uniqueUsers = new Set(messages?.map((m: any) => m.user_id) || []).size;

  return {
    roomId: args.roomId,
    roomName: room?.name || "Unknown",
    focusArea: room?.focus_area,
    ageGroup: room?.age_group,
    window: args.window,
    messageCount: messages?.length || 0,
    uniqueUsers,
    summary: `${messages?.length || 0} messages from ${uniqueUsers} users in the last ${args.window}`,
  };
}

// Handle approved action execution
async function handleActionExecution(supabase: any, moderatorId: string, actionData: any) {
  const { actionType, plan, auditId } = actionData;

  try {
    if (actionType === "moderation") {
      // Execute moderation action
      const { error } = await supabase
        .from("moderator_actions")
        .insert({
          moderator_id: moderatorId,
          target_user_id: plan.targetUserId,
          action: plan.action,
          reason: plan.reason,
          duration: plan.durationHours ? `${plan.durationHours} hours` : null,
          expires_at: plan.expiresAt,
          metadata: { message_id: plan.messageId },
        });

      if (error) throw error;

      // Update audit log
      if (auditId) {
        await supabase
          .from("ai_audit")
          .update({
            status: "executed",
            approved_by: moderatorId,
            approved_at: new Date().toISOString(),
          })
          .eq("id", auditId);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${plan.action} action executed against user ${plan.targetUsername}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle other action types (message, etc.)
    return new Response(JSON.stringify({
      success: true,
      message: "Action executed",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Action execution error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Update audit log with failure
    if (actionData.auditId) {
      await supabase
        .from("ai_audit")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", actionData.auditId);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Log tool call to audit
async function logAudit(supabase: any, actorId: string, tool: string, input: any, output: any) {
  const actionType = output.requiresApproval ? "propose" : "read";
  
  await supabase
    .from("ai_audit")
    .insert({
      actor: "ai",
      actor_id: actorId,
      tool,
      input_json: input,
      output_json: output,
      action: actionType,
      target: input.userId || input.roomId || null,
      status: output.requiresApproval ? "pending" : "executed",
    });
}