// 2D affine as [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f (canvas and CSS order)
export type M = [number, number, number, number, number, number];

export const I = (): M => [1, 0, 0, 1, 0, 0];
export const T = (x: number, y: number): M => [1, 0, 0, 1, x, y];
export const S = (x: number, y = x): M => [x, 0, 0, y, 0, 0];
export const R = (a: number): M => {
	const c = Math.cos(a), s = Math.sin(a);
	return [c, s, -s, c, 0, 0];
};

export function mul(m: M, n: M): M {
	return [
		m[0] * n[0] + m[2] * n[1],
		m[1] * n[0] + m[3] * n[1],
		m[0] * n[2] + m[2] * n[3],
		m[1] * n[2] + m[3] * n[3],
		m[0] * n[4] + m[2] * n[5] + m[4],
		m[1] * n[4] + m[3] * n[5] + m[5]
	];
}

/** Apply m about the point (px, py). */
export const about = (px: number, py: number, m: M): M => mul(mul(T(px, py), m), T(-px, -py));

export function inv(m: M): M {
	const det = m[0] * m[3] - m[1] * m[2];
	const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
	return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}

export const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

export const css = (m: M) => `matrix(${m[0]},${m[1]},${m[2]},${m[3]},${m[4]},${m[5]})`;
