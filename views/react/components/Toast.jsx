import { useEffect } from "react";

function Toast({ message, type, onClose }) {
	useEffect(() => {
		setTimeout(() => {
			onClose();
		}, 5000);
	}, []);

	return (
		<div
			className={`px-4 py-3 rounded shadow text-white flex items-center transition-opacity duration-300 ${
				type === "success" ? "bg-success" : "bg-error"
			} fixed top-6 right-6 z-50`}
		>
			<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d={type === "success" ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}
				/>
			</svg>
			<span>{message}</span>
			<button className="ml-4" onClick={onClose}>
				&times;
			</button>
		</div>
	);
}

export default Toast;
