import { error } from '@sveltejs/kit';
import { SUB_SCENES } from '#lib/scenes/index.ts';

export const entries = () => Object.keys(SUB_SCENES).map((venue) => ({ venue }));

export const load = ({ params }) => {
	const scene = SUB_SCENES[params.venue];
	if (!scene) error(404);
	return { scene };
};
