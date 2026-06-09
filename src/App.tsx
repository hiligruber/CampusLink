import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LocationSharingProvider } from "@/contexts/LocationSharingContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import GoogleMapsProvider from "@/components/GoogleMapsProvider";
import { useVerificationStatus } from "@/hooks/use-verification";
import Index from "./pages/Index";
import PostRide from "./pages/PostRide";

import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Bookings from "./pages/Bookings";
import ActiveRides from "./pages/ActiveRides";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import StudentVerification from "./pages/StudentVerification";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { isVerified, isAdmin, loading: vLoading } = useVerificationStatus();
  if (loading || vLoading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isVerified && !isAdmin) return <Navigate to="/verify" replace />;
  return <>{children}</>;
};

const VerifyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { isVerified, loading: vLoading } = useVerificationStatus();
  if (loading || vLoading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;
  if (isVerified) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <GoogleMapsProvider>
            <LocationSharingProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                    <Route path="/verify" element={<VerifyRoute><StudentVerification /></VerifyRoute>} />
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/post" element={<ProtectedRoute><PostRide /></ProtectedRoute>} />
                    <Route path="/search" element={<Navigate to="/" replace />} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
                    <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
                    <Route path="/active" element={<ProtectedRoute><ActiveRides /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </LocationSharingProvider>
          </GoogleMapsProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
