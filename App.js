import { ToastProvider } from "react-native-sprinkle-toast";
import Routes from "./src/Routes";



// MYAPP_UPLOAD_STORE_FILE=my-release-key.jks
// MYAPP_UPLOAD_KEY_ALIAS=upload
// MYAPP_UPLOAD_STORE_PASSWORD=Apfd@786
// MYAPP_UPLOAD_KEY_PASSWORD=Apfd@786

export default function App() {
  return (
    <>
    <ToastProvider>
      <Routes />
      </ToastProvider>
    </>
  );
}
