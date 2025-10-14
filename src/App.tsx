import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SkipToContent } from "@/components/layout/SkipToContent";
import { ArthurNotifications } from "@/components/arthur/ArthurNotifications";
import { ParentVerificationGate } from "@/components/family/ParentVerificationGate";
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
import Journal from "./pages/Journal";
import Trivia from "./pages/Trivia";
import TriviaAdmin from "./pages/admin/TriviaAdmin";
import Shipping from "./pages/policies/Shipping";
import Refunds from "./pages/policies/Refunds";
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";
import CommunityGuidelines from "./pages/legal/CommunityGuidelines";
import Crisis from "./pages/legal/Crisis";
import Inclusion from "./pages/legal/Inclusion";
import LegalIndex from "./pages/legal/LegalIndex";
import LegalAdmin from "./pages/admin/LegalAdmin";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AdminAI from "./pages/admin/AdminAI";
import ArthurAdmin from "./pages/admin/ArthurAdmin";
import Analytics from "./pages/admin/Analytics";
import HelpAdmin from "./pages/admin/HelpAdmin";
import HelpLocationsAdmin from "./pages/admin/HelpLocationsAdmin";
import ZipToolsAdmin from "./pages/admin/ZipToolsAdmin";
import HealthDashboard from "./pages/admin/HealthDashboard";
import FamilyChat from "./pages/FamilyChat";
import FeatureFlags from "./pages/admin/FeatureFlags";
import StripeAdmin from "./pages/admin/StripeAdmin";
import HelpNearby from "./pages/help/HelpNearby";
import NationalHotlines from "./pages/help/NationalHotlines";
import HelpResources from "./pages/help/HelpResources";
import LanguagePicker from "./pages/welcome/LanguagePicker";
import OpsAdmin from "./pages/admin/OpsAdmin";
import PublishReadiness from "./pages/admin/PublishReadiness";

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SkipToContent />
        <Toaster />
      <Sonner />
      <ArthurNotifications />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/welcome/language" element={<LanguagePicker />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/parent-verification" element={<ParentVerificationGate />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat-rooms" element={<ChatRooms />} />
          <Route path="/chat/:roomId" element={<ChatRoom />} />
          <Route path="/store" element={<Store />} />
          <Route path="/store/:ageGroup" element={<AgeGroupStore />} />
          <Route path="/store/product/:productId" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/library" element={<Library />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/trivia" element={<Trivia />} />
          <Route path="/policies/shipping" element={<Shipping />} />
          <Route path="/policies/refunds" element={<Refunds />} />
          <Route path="/legal" element={<LegalIndex />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/community-guidelines" element={<CommunityGuidelines />} />
          <Route path="/crisis" element={<Crisis />} />
          <Route path="/inclusion" element={<Inclusion />} />
          <Route path="/admin/ai" element={<AdminAI />} />
          <Route path="/admin/arthur" element={<ArthurAdmin />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/help" element={<HelpAdmin />} />
          <Route path="/admin/help-locations" element={<HelpLocationsAdmin />} />
          <Route path="/admin/zip-tools" element={<ZipToolsAdmin />} />
          <Route path="/admin/health" element={<HealthDashboard />} />
          <Route path="/family/chat" element={<FamilyChat />} />
          <Route path="/admin/legal" element={<LegalAdmin />} />
          <Route path="/admin/trivia" element={<TriviaAdmin />} />
          <Route path="/admin/flags" element={<FeatureFlags />} />
          <Route path="/admin/stripe" element={<StripeAdmin />} />
          <Route path="/admin/ops" element={<OpsAdmin />} />
          <Route path="/admin/publish" element={<PublishReadiness />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<HelpNearby />} />
          <Route path="/help/nearby" element={<HelpNearby />} />
          <Route path="/help/national" element={<NationalHotlines />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
