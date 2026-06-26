import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";


import { persistedStore, store } from "./reducers/allReducers";
import SessionChecking from "./sitelayout/SessionChecking";
import SiteLayout from "./sitelayout/SiteLayout";
import ModalPopup from "./sitelayout/ModalPopup";
import Overlay from "./sitelayout/Overlay";
import { ToastProvider } from "react-native-sprinkle-toast";
import LoginCommon from "./screens/LoginCommon";
import Home from "./screens/Home";


const Stack = createNativeStackNavigator();

export default function Routes() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistedStore}>
        <ToastProvider>
          <NavigationContainer>
            <ModalPopup />
            <Overlay />
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{ headerShown: false }}
            >
              {/* Login Screen */}
              <Stack.Screen name="Login" component={LoginCommon} />
              
    <Stack.Screen name="HOME">
                {(props) => (
                  <SessionChecking navigation={props.navigation}>
                    <SiteLayout
                      navigation={props.navigation}
                      currentScreenName="HOME"
                      scrollEnabled={false}
                    >
                      <Home{...props} />
                    </SiteLayout>
                  </SessionChecking>
                )}
              </Stack.Screen>

            </Stack.Navigator>
          </NavigationContainer>
        </ToastProvider>
      </PersistGate>
    </Provider>
  );
}
