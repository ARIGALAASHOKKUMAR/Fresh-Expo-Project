import { ToastProvider } from "react-native-sprinkle-toast";
import Routes from "./src/Routes";

export default function App() {
  return (
    <>
    <ToastProvider>
      <Routes />
      </ToastProvider>
    </>
  );
}
