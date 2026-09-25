# Location and composition references

Reviewed 2026-09-24. Selected Google Places photographs, Google Maps satellite views and the official SLU photograph were opened and visually inspected. The source ledger records addresses, coordinates and photograph attribution in [references/locations.json](references/locations.json). Source photographs remain in ignored `references/local/`; generated artwork interprets architecture and furniture, not an exact measured floor plan.

| Scene | Actual reference | Features carried into the composition |
| --- | --- | --- |
| Moosylvania | [7303 Marietta Ave](https://www.google.com/maps/search/Moosylvania+7303+Marietta); office and mezzanine photographs credited to Moosylvania | Converted church studio, tall round-arch windows, white walls and columns, exposed dark ceiling/ducts, pale desks, glass mezzanine and lime lounge seating. Four separate monitors occupy real desk positions. |
| Side Project Cellar | [7373 Marietta Ave](https://www.google.com/maps/search/Side+Project+Cellar+7373+Marietta); photos by the Cellar, Peter Delucchi and Christoffer Hultgren | Blue-gray walls, blond exposed ceiling joists, light wood bar/cooler enclosure, white metal stools, concrete floor and jar pendants. Taps and foreground stool retain the room perspective. |
| Brennan's | [316 N Euclid Ave](https://www.google.com/maps/search/Brennans+316+N+Euclid+St+Louis); room/bar photos by john paul anderson lionel and humidor photo by Crystal | Long narrow teal-paneled room, caramel banquette, pale tables, brick bar wall, cream tin ceiling, globe pendants and tall glass humidor. The small wall-mounted ATM interpretation is a portfolio content fixture; its exact hardware is not verified in the photos. |
| Foundry / Alamo | [City Foundry, 3730 Foundry Way](https://www.google.com/maps/search/City+Foundry+3730+Foundry+Way); [Alamo, 3765 Foundry Way Suite 275](https://www.google.com/maps/search/Alamo+Drafthouse+3765+Foundry+Way). Photos by City Foundry, Alamo and ArchEats | Industrial hall and modern rust-red cinema volume outside. Actual auditorium reference guides orange acoustic walls, dark reclining seats, individual dining tables, vertical cream sconces and aisle. Seats face away toward the screen. |
| SLU | **McDonnell Douglas Hall**, 3450 Lindell Blvd. [Official lobby photograph and caption](https://www.slu.edu/news/2020/february/argus2-launches.php), Maggie Rotermund / SLU; [computer labs](https://www.slu.edu/its/about/services-and-products/computer-labs.php) | Modern cream lobby, gray sofa, dark wall display, blond double doors with glass sidelights into the Boileau computer classroom. This replaces the invented historic arched lab. The diploma and blue foreground chair are portfolio adaptations. |

## Overworld geography

Viewed [Arch-area satellite imagery](https://www.google.com/maps/@38.6247,-90.1866,1548m/data=!3m1!1e3) and [metro-area satellite imagery](https://www.google.com/maps/@38.625,-90.255,14600m/data=!3m1!1e3). The retained composition uses a compressed illustrated map:

- Mississippi on the east; the Arch stands on its own riverside lawn. I-44 runs **west, beside the Arch grounds**, not through the Arch.
- Eads Bridge is north of the Arch; the larger I-64/Poplar Street crossing is south. These are distinct crossings.
- Maplewood is southwest, Forest Park northwest, Central West End northeast of Forest Park, SLU/Foundry in Midtown, downtown east and Carondelet Park south. Distances and individual street grids are stylized.
- Maplewood has no separate scene. Church entrance, welcome board, signpost and moose are placed on its overworld district. The rider belongs to the southern park district. No historical MonsterCommerce office facade has been verified; the Belleville warehouse is invented, and only its rooftop sign follows a verified source: Joe's MonsterCommerce logo and purple monster mascot (`references/local/places/monstercommerce/`, owner-supplied, logged in `references/locations.json`).

The overworld master is a diorama, not an aerial map: the camera sits at about 35 degrees, the skyline band along the top stands in for downtown, and only the named landmarks are drawn at cursor scale. Its river polygon, Eads deck, Poplar Street south end and Arch reset point in `src/lib/scenes/overworld.ts` were measured on that master.

## Visual language

[Cursor Camp](https://neal.fun/cursor-camp/) informs connected paths, shared ground, consistent camera angle and readable props; one screenshot of it (via Aftermath's write-up, kept in `references/local/cursor-camp/`) is attached to the overworld prompt for camera angle and object scale only. The original [daytime illustration](../prototypes/art-pipeline/reference/ref-scene-1-day.png) supplies bright greens, cyan, cream and coral. Brown is restricted to photographed wood, brick and upholstery instead of tinting every scene. The [arrival mock](../prototypes/art-pipeline/reference/ref-scene-0-arrival-mock.png) remains an architecture reference. Accessible labels and portfolio content are supplied by the application.
