import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import DemoExperience from "./pages/DemoExperience";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import Pricing from "./pages/Pricing";
import Team from "./pages/Team";
import UploadReport from "./pages/UploadReport";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/demo"} component={DemoExperience} />
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/team"} component={Team} />
      <Route path={"/upload"} component={UploadReport} />
      <Route path={"/clients"} component={Clients} />
      <Route path={"/pricing"} component={Pricing} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
