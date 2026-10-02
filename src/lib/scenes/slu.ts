import type { SubScene } from './types';

// World px at 2845 x 1600, measured on the CS lab master (art/generated/slu/slu-master, issue 05): an isometric lab with the
// whiteboard on the left back wall, the diploma on the right one and the exit doors at the far left. Prop and foreground
// rects are each measured matte's trim (art/generated/slu/<id>/asset.json). One depth region: the horizon is the floor at
// the back corner, the foreground line the bottom edge. The four desks, each with its monitor, keyboard and chair,
// are walk-behind scenery; their outlines are the mattes' polygons and their front lines run through the front feet.
export const SLU: SubScene = {
	id: 'slu',
	title: 'Saint Louis University, Midtown',
	description:
		'Inside the Saint Louis University computer science lab: Joe Madden’s BS in Computer Science with Honors, 2005, his senior project and his GitHub.',
	venue: 'Saint Louis University',
	district: 'Midtown',
	w: 2845,
	h: 1600,
	props: [
		{
			id: 'diploma',
			name: 'Diploma',
			gist: 'BS Computer Science with Honors, 2005',
			rect: { x: 2374, y: 167, w: 333, h: 457 },
			cosmetic: 1
		},
		{
			id: 'whiteboard',
			name: 'Whiteboard',
			gist: 'basis path testing, the senior project',
			rect: { x: 627, y: 0, w: 784, h: 672 },
			// Clipped where its lower edge reaches behind the near-left desk's monitor (spec: an irregular prop gets a clip-path).
			clip: 'polygon(100% 0%, 0% 0%, 0% 100%, 30.36% 100%, 30.36% 96.8%, 30.58% 96.46%, 64.6% 86.33%, 65.43% 87.42%, 65.28% 100%, 100% 100%)'
		},
		{
			id: 'workstation',
			name: 'Lab workstation',
			// Its GitHub link is in its copy alone (Joe, 2026-10-01).
			gist: 'Joe’s GitHub',
			rect: { x: 793, y: 1021, w: 284, h: 239 },
			// Clipped where its top edge reaches behind the near-left desk's back leg and chair base (spec: an irregular prop gets a clip-path).
			clip: 'polygon(0% 100%, 100% 100%, 100% 3.12%, 74.31% 5.86%, 62.62% 4.85%, 61.76% 0%, 22.53% 0%, 22.52% 21.33%, 21.74% 22.16%, 11.81% 22.91%, 11.74% 0%, 0% 0%)'
		}
	],
	exit: { x: 72, y: 200, w: 353, h: 774 },
	depth: [{ rect: { x: 0, y: 0, w: 2845, h: 1600 }, horizonY: 537, foregroundY: 1600 }],
	foreground: [],
	walkBehind: [
		{
			key: 'slu-desk-front-left',
			desk: true,
			rect: { x: 751, y: 584, w: 534, h: 510 },
			outline: [
				{ x: 868, y: 651 }, { x: 1132, y: 583 }, { x: 1137, y: 588 }, { x: 1135, y: 724 }, { x: 1160, y: 719 },
				{ x: 1285, y: 816 }, { x: 1285, y: 831 }, { x: 1273, y: 833 }, { x: 1273, y: 1003 }, { x: 1247, y: 1007 },
				{ x: 1247, y: 838 }, { x: 1189, y: 850 }, { x: 1189, y: 922 }, { x: 1176, y: 927 }, { x: 1174, y: 969 },
				{ x: 1166, y: 981 }, { x: 1155, y: 990 }, { x: 1137, y: 1015 }, { x: 1137, y: 1042 }, { x: 1166, y: 1070 },
				{ x: 1167, y: 1090 }, { x: 1143, y: 1093 }, { x: 1098, y: 1058 }, { x: 1082, y: 1025 }, { x: 1004, y: 1032 },
				{ x: 973, y: 1030 }, { x: 970, y: 1015 }, { x: 983, y: 1003 }, { x: 961, y: 969 }, { x: 939, y: 947 },
				{ x: 941, y: 916 }, { x: 941, y: 903 }, { x: 854, y: 920 }, { x: 854, y: 1071 }, { x: 829, y: 1073 },
				{ x: 829, y: 925 }, { x: 788, y: 865 }, { x: 788, y: 984 }, { x: 766, y: 986 }, { x: 764, y: 837 },
				{ x: 750, y: 820 }, { x: 750, y: 803 }, { x: 868, y: 779 }
			],
			front: [{ x: 776, y: 986 }, { x: 841, y: 1071 }, { x: 1259, y: 1005 }],
			props: []
		},
		{
			key: 'slu-desk-front-right',
			desk: true,
			rect: { x: 1600, y: 579, w: 534, h: 539 },
			outline: [
				{ x: 1719, y: 646 }, { x: 1947, y: 578 }, { x: 1957, y: 585 }, { x: 1957, y: 709 }, { x: 1991, y: 701 },
				{ x: 2134, y: 803 }, { x: 2134, y: 818 }, { x: 2118, y: 821 }, { x: 2117, y: 990 }, { x: 2093, y: 993 },
				{ x: 2093, y: 828 }, { x: 2032, y: 845 }, { x: 2028, y: 961 }, { x: 2011, y: 973 }, { x: 2008, y: 990 },
				{ x: 1986, y: 1015 }, { x: 1986, y: 1044 }, { x: 2008, y: 1071 }, { x: 2010, y: 1095 }, { x: 1986, y: 1098 },
				{ x: 1931, y: 1068 }, { x: 1907, y: 1097 }, { x: 1906, y: 1117 }, { x: 1880, y: 1117 }, { x: 1879, y: 1097 },
				{ x: 1826, y: 1064 }, { x: 1824, y: 1076 }, { x: 1799, y: 1078 }, { x: 1797, y: 1056 }, { x: 1827, y: 1035 },
				{ x: 1826, y: 1015 }, { x: 1846, y: 1000 }, { x: 1817, y: 962 }, { x: 1799, y: 947 }, { x: 1799, y: 932 },
				{ x: 1805, y: 922 }, { x: 1805, y: 905 }, { x: 1742, y: 923 }, { x: 1741, y: 1078 }, { x: 1717, y: 1080 },
				{ x: 1717, y: 927 }, { x: 1640, y: 848 }, { x: 1640, y: 976 }, { x: 1616, y: 978 }, { x: 1615, y: 825 },
				{ x: 1599, y: 811 }, { x: 1599, y: 797 }, { x: 1719, y: 769 }
			],
			front: [{ x: 1627, y: 978 }, { x: 1729, y: 1080 }, { x: 2105, y: 991 }],
			props: []
		},
		{
			key: 'slu-desk-back-left',
			desk: true,
			rect: { x: 650, y: 1019, w: 627, h: 569 },
			outline: [
				{ x: 791, y: 1083 }, { x: 1072, y: 1018 }, { x: 1079, y: 1024 }, { x: 1079, y: 1136 }, { x: 1130, y: 1124 },
				{ x: 1278, y: 1236 }, { x: 1278, y: 1253 }, { x: 1263, y: 1260 }, { x: 1263, y: 1440 }, { x: 1234, y: 1444 },
				{ x: 1234, y: 1265 }, { x: 1147, y: 1287 }, { x: 1145, y: 1403 }, { x: 1126, y: 1420 }, { x: 1125, y: 1438 },
				{ x: 1099, y: 1471 }, { x: 1101, y: 1495 }, { x: 1126, y: 1522 }, { x: 1130, y: 1549 }, { x: 1104, y: 1552 },
				{ x: 1046, y: 1532 }, { x: 1019, y: 1563 }, { x: 1019, y: 1586 }, { x: 992, y: 1588 }, { x: 990, y: 1563 },
				{ x: 929, y: 1529 }, { x: 929, y: 1546 }, { x: 900, y: 1546 }, { x: 898, y: 1520 }, { x: 932, y: 1496 },
				{ x: 931, y: 1471 }, { x: 936, y: 1455 }, { x: 897, y: 1404 }, { x: 893, y: 1381 }, { x: 902, y: 1374 },
				{ x: 902, y: 1352 }, { x: 798, y: 1379 }, { x: 798, y: 1551 }, { x: 773, y: 1554 }, { x: 773, y: 1386 },
				{ x: 696, y: 1306 }, { x: 696, y: 1423 }, { x: 670, y: 1427 }, { x: 670, y: 1279 }, { x: 650, y: 1260 },
				{ x: 650, y: 1241 }, { x: 791, y: 1207 }
			],
			front: [{ x: 682, y: 1425 }, { x: 784, y: 1552 }, { x: 1247, y: 1442 }],
			props: ['workstation']
		},
		{
			key: 'slu-desk-back-right',
			desk: true,
			rect: { x: 1921, y: 978, w: 578, h: 584 },
			outline: [
				{ x: 2044, y: 1049 }, { x: 2297, y: 978 }, { x: 2304, y: 984 }, { x: 2304, y: 1100 }, { x: 2338, y: 1092 },
				{ x: 2500, y: 1207 }, { x: 2500, y: 1224 }, { x: 2483, y: 1229 }, { x: 2481, y: 1411 }, { x: 2457, y: 1415 },
				{ x: 2457, y: 1236 }, { x: 2382, y: 1258 }, { x: 2380, y: 1370 }, { x: 2362, y: 1391 }, { x: 2357, y: 1415 },
				{ x: 2331, y: 1445 }, { x: 2335, y: 1471 }, { x: 2365, y: 1503 }, { x: 2367, y: 1527 }, { x: 2343, y: 1529 },
				{ x: 2272, y: 1498 }, { x: 2268, y: 1547 }, { x: 2260, y: 1563 }, { x: 2243, y: 1561 }, { x: 2238, y: 1542 },
				{ x: 2243, y: 1510 }, { x: 2169, y: 1506 }, { x: 2163, y: 1525 }, { x: 2142, y: 1523 }, { x: 2142, y: 1503 },
				{ x: 2171, y: 1454 }, { x: 2173, y: 1440 }, { x: 2135, y: 1379 }, { x: 2134, y: 1359 }, { x: 2147, y: 1347 },
				{ x: 2147, y: 1326 }, { x: 2083, y: 1345 }, { x: 2083, y: 1512 }, { x: 2059, y: 1513 }, { x: 2059, y: 1350 },
				{ x: 1962, y: 1250 }, { x: 1962, y: 1377 }, { x: 1938, y: 1379 }, { x: 1936, y: 1228 }, { x: 1921, y: 1211 },
				{ x: 1921, y: 1194 }, { x: 2044, y: 1163 }
			],
			front: [{ x: 1950, y: 1379 }, { x: 2071, y: 1513 }, { x: 2469, y: 1413 }],
			props: []
		}
	]
};
