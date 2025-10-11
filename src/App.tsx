import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import ChatRooms from "./pages/ChatRooms";
import ChatRoom from "./pages/ChatRoom";
import Store from "./pages/Store";
import AgeGroupStore from "./pages/AgeGroupStore";
import Cart from "./pages/Cart";
import ProductDetail from "./pages/ProductDetail";
import Library from "./pages/Library";
import Orders from "./pages/Orders";
import Shipping from "./pages/policies/Shipping";
import Refunds from "./pages/policies/Refunds";
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";
import CommunityGuidelines from "./pages/legal/CommunityGuidelines";
import Crisis from "./pages/legal/Crisis";
import Inclusion from "./pages/legal/Inclusion";
import NotFound from "./pages/NotFound";
import AdminAI from "./pages/admin/AdminAI";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat-rooms" element={<ChatRooms />} />
          <Route path="/chat/:roomId" element={<ChatRoom />} />
          <Route path="/store" element={<Store />} />
          <Route path="/store/:ageGroup" element={<AgeGroupStore />} />
          <Route path="/store/product/:productId" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/library" element={<Library />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/policies/shipping" element={<Shipping />} />
          <Route path="/policies/refunds" element={<Refunds />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/community-guidelines" element={<CommunityGuidelines />} />
          <Route path="/crisis" element={<Crisis />} />
          <Route path="/inclusion" element={<Inclusion />} />
          <Route path="/admin/ai" element={<AdminAI />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
