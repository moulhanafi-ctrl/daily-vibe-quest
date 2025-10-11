import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Globe, Eye, Link as LinkIcon, Heart, ShoppingBag, Users } from "lucide-react";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface CheckItem {
  id: string;
  label: string;
  status: "pass" | "fail" | "pending";
  notes?: string;
}

export const QAChecklist = () => {
  const [i18nChecks, setI18nChecks] = useState<CheckItem[]>([
    { id: "missing_keys", label: "i18n_missing_key count = 0", status: "pending" },
    { id: "ar_rtl", label: "AR sets dir='rtl' and mirrors UI", status: "pending" },
    { id: "es_flow", label: "ES full flow tested", status: "pending" },
    { id: "fr_flow", label: "FR full flow tested", status: "pending" },
  ]);

  const [a11yChecks, setA11yChecks] = useState<CheckItem[]>([
    { id: "axe_scan", label: "Axe scan shows no critical violations", status: "pending" },
    { id: "focus_rings", label: "Visible focus rings on all interactive elements", status: "pending" },
    { id: "text_scale", label: "Text scaling 125-150% without overlap", status: "pending" },
    { id: "hit_targets", label: "Interactive elements ≥44px", status: "pending" },
    { id: "aria_labels", label: "ARIA labels on icon-only buttons", status: "pending" },
  ]);

  const [seoChecks, setSeoChecks] = useState<CheckItem[]>([
    { id: "link_checker", label: "Internal/external links validated", status: "pending" },
    { id: "og_home", label: "OG tags valid for Home", status: "pending" },
    { id: "og_pdp", label: "OG tags valid for PDP", status: "pending" },
    { id: "og_rooms", label: "OG tags valid for Rooms", status: "pending" },
    { id: "og_legal", label: "OG tags valid for Legal", status: "pending" },
    { id: "sitemap", label: "/sitemap.xml served", status: "pending" },
    { id: "robots", label: "/robots.txt served", status: "pending" },
  ]);

  const [crisisChecks, setCrisisChecks] = useState<CheckItem[]>([
    { id: "us_988", label: "US EN/ES → 988 visible", status: "pending" },
    { id: "intl_fallback", label: "AR/FR → correct hotline fallback", status: "pending" },
    { id: "24_7_override", label: "24/7 lines show 'Open now'", status: "pending" },
  ]);

  const [coreFlowChecks, setCoreFlowChecks] = useState<CheckItem[]>([
    { id: "signup_en", label: "EN: Signup → consent → check-in → journal", status: "pending" },
    { id: "signup_es", label: "ES: Signup → consent → check-in → journal", status: "pending" },
    { id: "signup_fr", label: "FR: Signup → consent → check-in → journal", status: "pending" },
    { id: "signup_ar", label: "AR: Signup → consent → check-in → journal", status: "pending" },
    { id: "rooms_safety", label: "Rooms: Report/Mute/Rules chip work", status: "pending" },
    { id: "store_purchase", label: "Store: PDP → cart → purchase → entitlement", status: "pending" },
    { id: "parent_flow", label: "Parent verification unlocks features", status: "pending" },
    { id: "local_help", label: "Local Help: Call/Website/Directions", status: "pending" },
  ]);

  const updateStatus = (
    checks: CheckItem[],
    setChecks: React.Dispatch<React.SetStateAction<CheckItem[]>>,
    id: string,
    status: "pass" | "fail" | "pending"
  ) => {
    setChecks(checks.map(c => c.id === id ? { ...c, status } : c));
  };

  const getStatusIcon = (status: "pass" | "fail" | "pending") => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: "pass" | "fail" | "pending") => {
    const variants = {
      pass: "default",
      fail: "destructive",
      pending: "secondary",
    };
    return <Badge variant={variants[status] as any}>{status}</Badge>;
  };

  const calculateProgress = (checks: CheckItem[]) => {
    const passed = checks.filter(c => c.status === "pass").length;
    return `${passed}/${checks.length}`;
  };

  const CheckSection = ({
    title,
    icon: Icon,
    checks,
    setChecks,
  }: {
    title: string;
    icon: any;
    checks: CheckItem[];
    setChecks: React.Dispatch<React.SetStateAction<CheckItem[]>>;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-medium">{title}</span>
        </div>
        <span className="text-sm text-muted-foreground">{calculateProgress(checks)}</span>
      </div>
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.id} className="flex items-center justify-between p-2 rounded border">
            <div className="flex items-center gap-2 flex-1">
              {getStatusIcon(check.status)}
              <span className="text-sm">{check.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(check.status)}
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(checks, setChecks, check.id, "pass")}
                  className="h-7 px-2"
                >
                  ✓
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(checks, setChecks, check.id, "fail")}
                  className="h-7 px-2"
                >
                  ✗
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phase A - Final QA Checklist</CardTitle>
        <CardDescription>
          Multilingual QA pass across all critical flows
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="i18n">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                i18n Sweep ({calculateProgress(i18nChecks)})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CheckSection
                title="Internationalization"
                icon={Globe}
                checks={i18nChecks}
                setChecks={setI18nChecks}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="a11y">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Accessibility ({calculateProgress(a11yChecks)})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CheckSection
                title="Accessibility"
                icon={Eye}
                checks={a11yChecks}
                setChecks={setA11yChecks}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="seo">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Links & SEO ({calculateProgress(seoChecks)})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CheckSection
                title="SEO & Links"
                icon={LinkIcon}
                checks={seoChecks}
                setChecks={setSeoChecks}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="crisis">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Crisis & Help ({calculateProgress(crisisChecks)})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CheckSection
                title="Crisis Resources"
                icon={Heart}
                checks={crisisChecks}
                setChecks={setCrisisChecks}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="flows">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Core Flows ({calculateProgress(coreFlowChecks)})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CheckSection
                title="User Flows"
                icon={Users}
                checks={coreFlowChecks}
                setChecks={setCoreFlowChecks}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};
