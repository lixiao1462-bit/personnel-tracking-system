import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import Alarms from "@/pages/Alarms";
import Cameras from "@/pages/Cameras";
import SafetyZones from "@/pages/SafetyZones";
import Models from './pages/Models';
import Dictionaries from './pages/Dictionaries';
import MapManagement from './pages/MapManagement';
import Logs from './pages/Logs';
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/alarms" component={Alarms} />
      <ProtectedRoute path="/cameras" component={Cameras} />
      <ProtectedRoute path="/safety-zones" component={SafetyZones} />
      <ProtectedRoute path="/models" component={Models} />
          <ProtectedRoute path="/dictionaries" component={Dictionaries} />
          <ProtectedRoute path="/maps" component={MapManagement} />
          <ProtectedRoute path="/logs" component={Logs} />
          <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TooltipProvider>
            <Toaster position="top-right" theme="dark" />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
