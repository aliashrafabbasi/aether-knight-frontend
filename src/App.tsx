import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/context/ToastContext";
import { ToastContainer } from "@/components/ToastContainer";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthBootstrap>
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
          <ToastContainer />
        </AuthBootstrap>
      </ToastProvider>
    </QueryClientProvider>
  );
}
