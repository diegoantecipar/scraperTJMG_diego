import { createContext, useContext, useState } from "react";
import Toast from "./components/Toast";

export const ConfigContext = createContext(null);
export const useConfig = () => useContext(ConfigContext);
export const ToastContext = createContext({
	show: () => {},
});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
	const [toast, setToast] = useState(null);

	const show = (message, type = "success") => setToast({ message, type });
	const hide = () => setToast(null);

	return (
		<ToastContext.Provider value={{ show }}>
			{children}
			{toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
		</ToastContext.Provider>
	);
}
