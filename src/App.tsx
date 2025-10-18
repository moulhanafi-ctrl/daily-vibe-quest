import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { SkipToContent } from "@/components/layout/SkipToContent";
import { ArthurNotifications } from "@/components/arthur/ArthurNotifications";
import { ParentVerificationGate } from "@/components/family/ParentVerificationGate";
import { MobileKeyboardHandler } from "@/components/MobileKeyboardHandler";
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
import SessionTrivia from "./pages/SessionTrivia";
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
import ArthurAdmin from "./pages/admin/ArthleAdmin";
import Analytics from "./pages/admin/Analytics";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SubscriberAnalytics from "./pages/admin/SubscriberAnalytics";
import StoreAdmin from "./pages/admin/StoreAdmin";
import HelpAdmin from "./pages/admin/HelpAdmin";
import HelpLocationsAdmin from "./pages/admin/HelpLocationsAdmin";
import ZipToolsAdmin from "./pages/admin/ZipToolsAdmin";
import ProductsAdmin from "./pages/admin/ProductsAdmin";
import ProductForm from "./pages/admin/ProductForm";
import HealthDashboard from "./pages/admin/HealthDashboard";
import FamilyChat from "./pages/FamilyChat";
import FamilyMembers from "./pages/FamilyMembers";
import ParentJournalViewer from "./pages/family/ParentJournalViewer";
import StoriesArchive from "./pages/family/StoriesArchive";
import FeatureFlags from "./pages/admin/FeatureFlags";
import StripeAdmin from "./pages/admin/StripeAdmin";
import HelpNearby from "./pages/help/HelpNearby";
import NationalHotlines from "./pages/help/NationalHotlines";
import HelpResources from "./pages/help/HelpResources";
import TherapistsNearby from "./pages/help/TherapistsNearby";
import LanguagePicker from "./pages/welcome/LanguagePicker";
import OpsAdmin from "./pages/admin/OpsAdmin";
import PublishReadiness from "./pages/admin/PublishReadiness";
import ProductionDashboard from "./pages/admin/ProductionDashboard";
import AIDigestsAdmin from "./pages/admin/AIDigestsAdmin";
import DailyAIMessagesAdmin from "./pages/admin/DailyAIMessagesAdmin";
import EmailDiagnostics from "./pages/admin/EmailDiagnostics";
import StripeDiagnostics from "./pages/admin/StripeDiagnostics";
import Recovery from "./pages/auth/Recovery";
import VerifyCode from "./pages/auth/VerifyCode";
import ResetPassword from "./pages/auth/ResetPassword";

const queryClient = new QueryClient();

const TriviaRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/trivia/sessions${location.search}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SkipToContent />
        <Toaster />
      <Sonner />
      <MobileKeyboardHandler />
      <ArthurNotifications />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/welcome/language" element={<LanguagePicker />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/recovery" element={<Recovery />} />
          <Route path="/auth/verify-code" element={<VerifyCode />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/parent-verification" element={<ParentVerificationGate />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<Navigate to="/chat-rooms" replace />} />
          <Route path="/chat-rooms" element={<ChatRooms />} />
          <Route path="/chat-rooms/:focusArea" element={<ChatRoom />} />
          <Route path="/chat/:roomId" element={<ChatRoom />} />
          <Route path="/chat/:focusArea/:roomId" element={<ChatRoom />} />
          <Route path="/store" element={<Store />} />
          <Route path="/store/:ageGroup" element={<AgeGroupStore />} />
          <Route path="/store/product/:productId" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/library" element={<Library />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/trivia" element={<TriviaRedirect />} />
          <Route path="/trivia/sessions" element={<SessionTrivia mode="auto" />} />
          <Route path="/trivia/demo" element={<SessionTrivia mode="demo" />} />
          <Route path="/policies/shipping" element={<Shipping />} />
          <Route path="/policies/refunds" element={<Refund

s />} />
          <Route path="/legal" element={<LegalIndex />} />
          <Route path="/legal/terms" element={<Terms />} />
          <Route path="/legal/privacy" element={<Privacy />} />
          <Route path="/legal/community-guidelines" element={<CommunityGuidelines />} />
          <Route path="/legal/crisis" element={<Crisis />} />
          <Route path="/legal/inclusion" element={<Inclusion />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/ai" element={<AdminAI />} />
          <Route path="/admin/arthur" element={<ArthurAdmin />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/subscriber-analytics" element={<SubscriberAnalytics />} />
          <Route path="/admin/store" element={<StoreAdmin />} />
          <Route path="/admin/help" element={<HelpAdmin />} />
          <Route path="/admin/help-locations" element={<HelpLocationsAdmin />} />
          <Route path="/admin/zip-tools" element={<ZipToolsAdmin />} />
          <Route path="/admin/products" element={<ProductsAdmin />} />
          <Route path="/admin/products/new" element={<ProductForm />} />
          <Route path="/admin/products/:id" element={<ProductForm />} />
          <Route path="/admin/store" element={<StoreAdmin />} />
          <Route path="/admin/health" element={<HealthDashboard />} />
          <Route path="/family/chat" element={<FamilyChat />} />
          <Route path="/family/members" element={<FamilyMembers />} />
          <Route path="/family/journals" element={<ParentJournalViewer />} />
          <Route path="/family/stories-archive" element={<StoriesArchive />} />
          <Route path="/admin/legal" element={<LegalAdmin />} />
          <Route path="/admin/trivia" element={<TrivieAdmin />} />
          <Route path="/admin/flags" element={<FeatureFlags />} />
          <Route path="/admin/stripe" element={<StripeAdmin />} />
          <Route path="/admin/ops" element={<OpsAdmin />} />
          <Route path="/admin/publish" element={<PublishReadiness />} />
          <Route path="/admin/production" element={<ProductionDashboard />} />
          <Route path="/admin/ai-digests" element={<AIDigestsAdmin />} />
          <Route path="/admin/daily-messages" element={<DailyAIMessagesAdmin />} />
          <Route path="/admin/email-diagnostics" element={<EmailDiagnostics />} />
          <Route path="/admin/stripe-diagnostics" element={<StripeDiagnostics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<HelpNearby />} />
          <Route path="/help/nearby" element={<HelpNearby />} />
          <Route path="/help/therapists" element={<TherapistsNearby />} />
          <Route path="/help/national" element={<NationalHotlines />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;