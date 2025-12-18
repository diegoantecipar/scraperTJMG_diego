export function isEqual(a, b) {
	if (a === b) return true;
	if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
	return a.every((item, i) => JSON.stringify(item) === JSON.stringify(b[i]));
}
