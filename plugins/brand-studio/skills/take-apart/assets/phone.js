/* Example take-apart model: how a phone is built, four levels deep (phone > logic board > processor > silicon die).
   Every figure lists its layers from the bottom up; zA is a layer's height while the thing is whole. A part with `open`
   names the figure that a click on it zooms into, and its `id` matches a hit() in the layer's drawing. */
const W = 112, L = 230, R = 18; // the phone's width, length and corner radius

model({
  fig: 'Fig. 1',
  // The ?film tour: each stop dives through these part ids from the top figure, then lights these layers of the last figure.
  tour: [{ dive: ['board', 'processor', 'die'], light: ['transistors', 'thick'] }, { dive: ['rear', 'pixels'], light: ['filter'] }],
  end: ['Brand Studio', 'Exploded views you can take apart and zoom into, in your brand.', 'brandstudio.js.org'],
  // Definitions the drawings share: the glass's clip path and the screen's gradient.
  defs: `<clipPath id="glassClip"><path d="${rr(0, 0, W, L, R)}"/></clipPath>`
    + `<linearGradient id="scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a40"/><stop offset=".55" stop-color="#1b1b1f"/><stop offset="1" stop-color="#0c0c0e"/></linearGradient>`,
  figures: {
    phone: {
      crumb: 'Phone', heading: 'How a phone is built', gap: [104, 86],
      alt: 'A phone lying face up. Taken apart it shows five layers: cover glass, display, frame, the board, battery and cameras, and the glass back with its charging coil.',
      caption: 'A phone comes apart into five layers. Pick a layer, then a part, to zoom in.',
      layers: [
        { key: 'back', title: 'Back', readout: 'Glass back with a coil for wireless charging.', zA: 0,
          parts: [{ name: 'Charging coil', at: [56, 150, 4], open: 'coil', id: 'coil' }, { name: 'Camera window', at: [29, 29, 4] }],
          draw: () => slab(0, 0, W, L, R, 0, 4)
            + flat(4, `<path d="${rr(6, 6, 46, 46, 12)}"/>` + holes([[18.5, 18.5, 8], [39.5, 18.5, 8], [18.5, 39.5, 8], [39.5, 39.5, 3.2]]))
            + hit('coil', 'coil', 'the charging coil', flat(4, rings(56, 150, [10, 16, 22, 28, 34]) + `<circle class="hitarea" cx="56" cy="150" r="36"/>`)) },
        { key: 'inside', title: 'Board, battery and cameras', readout: 'Everything that works. The battery takes the most room.', zA: 4,
          parts: [{ name: 'Rear cameras', at: [29, 29, 8.5], open: 'camera', id: 'rear' }, { name: 'Front camera', at: [56, 12, 4], open: 'camera', id: 'front' },
            { name: 'Logic board', at: [81, 46, 4.2], open: 'board', id: 'board' }, { name: 'Battery', at: [56, 172, 6], open: 'battery', id: 'battery' }, { name: 'Speaker', at: [84, 220.5, 4] }],
          draw: () => outline(0, 0, W, L, R)
            + hit('camera', 'rear', 'the rear cameras', slab(8, 8, 42, 42, 10, 0, 5)
              + cyl(18.5, 18.5, 7, 5, 3.5, { top: 'lens' }) + cyl(39.5, 18.5, 7, 5, 3.5, { top: 'lens' }) + cyl(18.5, 39.5, 7, 5, 3.5, { top: 'lens' }) + cyl(39.5, 39.5, 2.6, 5, 1, { top: 'flash' }))
            + hit('camera', 'front', 'the front camera', cyl(56, 12, 4, 0, 4, { top: 'lens' }))
            + hit('board', 'board', 'the logic board', slab(58, 22, 46, 88, 5, 0, 2)
              + slab(65, 30, 32, 32, 3, 2, 2.2, { top: 'chip', side: 'chip' }) + slab(65, 68, 32, 14, 2, 2, 1.6, { top: 'chip', side: 'chip' })
              + slab(65, 88, 13, 13, 2, 2, 1.4, { top: 'chip', side: 'chip' }) + slab(84, 88, 13, 13, 2, 2, 1.4, { top: 'chip', side: 'chip' }))
            + hit('battery', 'battery', 'the battery', slab(44, 110.5, 24, 5, 1.5, 0, 1)
              + slab(8, 116, 96, 94, 8, 0, 6) + flat(6, `<path d="${rr(16, 124, 80, 78, 5)}"/><path d="M28 146H62M28 156H76M28 166H54"/>`))
            + slab(8, 216, 40, 9, 3, 0, 5)
            + slab(64, 216, 40, 9, 3, 0, 4) + flat(4, holes([72, 78, 84, 90, 96].map(x => [x, 220.5, .9]))) },
        { key: 'frame', title: 'Frame', readout: 'Metal frame that holds every part. Buttons and the port sit on its edge.', zA: 4,
          parts: [{ name: 'Power button', at: [W + 1.1, 79, 7.4] }, { name: 'USB-C port', at: [56, L, 7.2] }],
          draw: () => solid({ d: rr(0, 0, W, L, R) + rr(4, 4, W - 8, L - 8, R - 4), evenodd: true, bounds: [0, 0, W, L], tan: rrTan(0, 0, W, L, R), h: 10 })
            + `<g transform="${faceY(L)}" class="det"><path class="hole" d="${rr(44, 2.8, 24, 4.4, 2.2)}"/>${holes([22, 27, 76, 80.5, 85, 89.5, 94].map(u => [u, 5, .9]))}<path d="M14 0V10M98 0V10"/></g>`
            + `<g transform="${faceX(W)}" class="det"><path d="M40 0V10M196 0V10"/></g>`
            + slab(W, 64, 2.2, 30, 1, 3, 4.4) },
        { key: 'display', title: 'Display', readout: 'OLED panel. Each pixel makes its own light, so black pixels stay off.', zA: 14,
          parts: [{ name: 'Screen', at: [56, 110, 3], open: 'screen', id: 'screen' }, { name: 'Front camera hole', at: [56, 12, 3] }],
          draw: () => slab(1.5, 1.5, W - 3, L - 3, R - 1.5, 0, 3, { side: 'dark', top: 'panel' })
            + hit('screen', 'screen', 'the screen', flat(3, `<path d="${rr(4, 4, W - 8, L - 8, R - 4)}" fill="url(#scr)"/><circle cx="56" cy="12" r="3" fill="#000"/>`
                + `<text x="56" y="36" font-size="8">Friday 16 October</text><text x="56" y="68" font-size="30" font-weight="300">10:08</text>`
                + `<path d="${rr(10, 150, W - 20, 30, 8)}" fill="#ffffff" fill-opacity=".14"/><path d="M18 161H70M18 170H56" stroke="#ffffff" stroke-opacity=".4" stroke-width="2.4" stroke-linecap="round"/>`
                + `<path d="${rr(38, L - 14, 36, 3, 1.5)}" fill="#ffffff" fill-opacity=".7"/>`, 'screen'),
              spot(36, 90, 40, 3)) },
        { key: 'glass', title: 'Cover glass', readout: 'Toughened glass that keeps the screen safe.', zA: 17,
          draw: () => solid({ d: rr(0, 0, W, L, R), bounds: [0, 0, W, L], tan: rrTan(0, 0, W, L, R), h: 1.6, top: 'glass', side: 'glass' })
            + flat(1.6, `<path class="shine" clip-path="url(#glassClip)" d="M66 0H90L0 156V132Z"/>`, '') },
      ],
    },

    camera: {
      crumb: 'Camera', heading: 'Inside a camera', gap: [92, 76],
      alt: 'A phone camera taken apart: the board and cable, the image sensor, an infrared filter, the focus motor and the lens stack.',
      caption: 'Each camera in the phone, front and back, is built much like this.',
      layers: [
        { key: 'cboard', title: 'Board and cable', readout: 'Sends the picture to the logic board through a thin cable.', zA: 0,
          parts: [{ name: 'Connector', at: [85, 217, 4] }],
          draw: () => slab(0, 0, 170, 170, 10, 0, 4)
            + [[16, 118], [128, 20], [140, 128]].map(([x, y]) => slab(x, y, 12, 7, 1.5, 4, 1.6, { top: 'chip', side: 'chip' })).join('')
            + slab(62, 170, 46, 38, 2, 0, .8, { top: 'foil' }) + slab(54, 206, 62, 22, 3, 0, 4) },
        { key: 'sensor', title: 'Image sensor', readout: 'Millions of tiny pixels turn the light into a picture.', zA: 4,
          parts: [{ name: 'Pixels', at: [85, 85, 3], open: 'pixel', id: 'pixels' }],
          draw: () => hit('pixel', 'pixels', 'the pixels', slab(35, 35, 100, 100, 4, 0, 3, { top: 'chip', side: 'chip' })
            + flat(3, `<rect x="50" y="50" width="70" height="70" fill="url(#sensor)" stroke="none"/><path d="${rr(50, 50, 70, 70, 2)}"/>`),
            spot(75, 75, 20, 3)) },
        { key: 'filter', title: 'Infrared filter', readout: 'Thin glass that blocks infrared light, so colours look right.', zA: 7,
          draw: () => slab(28, 28, 114, 114, 3, 0, 1.2, { top: 'ir', side: 'glass' }) },
        { key: 'motor', title: 'Focus motor', readout: 'Magnets and a coil slide the lenses up and down to focus.', zA: 8.2,
          parts: [{ name: 'Magnets', at: [28, 28, 22] }, { name: 'Coil', at: [85 + 58 * K, 85 + 58 * K, 22] }],
          draw: () => solid({ d: rr(10, 10, 150, 150, 14) + circ(85, 85, 50), evenodd: true, bounds: [10, 10, 160, 160], tan: rrTan(10, 10, 150, 150, 14), h: 22, top: 'metal' })
            + flat(22, rings(85, 85, [56, 60]) + [[18, 18], [132, 18], [18, 132], [132, 132]].map(([x, y]) => `<rect class="mag" x="${x}" y="${y}" width="20" height="20" rx="3"/>`).join('')) },
        { key: 'lens', title: 'Lenses', readout: 'A stack of tiny plastic lenses bends the light onto the sensor.', zA: 30.2,
          draw: () => cyl(85, 85, 44, 0, 26, { top: 'metal' })
            + [7, 13, 19].map(z => flat(z, `<path d="${frontArc(85, 85, 44)}"/>`)).join('')
            + flat(26, `<circle class="glassdisc" cx="85" cy="85" r="34"/><g class="lensring">${rings(85, 85, [14, 24])}</g><path class="glint" d="M70 64A22 22 0 0 1 96 60"/>`, '') },
      ],
    },

    board: {
      crumb: 'Logic board', heading: 'Inside the logic board', gap: [92, 76],
      alt: 'A phone logic board taken apart: the circuit board, its chips, the memory stacked on the processor, and a metal shield.',
      caption: 'The logic board is the phone\'s computer. Every other part plugs into it.',
      layers: [
        { key: 'pcb', title: 'Circuit board', readout: 'Thin layers of copper wiring join every chip and connector.', zA: 0,
          parts: [{ name: 'Camera connector', at: [29, 14, 6] }, { name: 'Display connector', at: [85, 14, 6] }, { name: 'Battery connector', at: [58, 205, 6] }],
          draw: () => slab(0, 0, 115, 220, 10, 0, 3)
            + flat(3, `<path d="M22 30V56H50M93 30V64H70M20 112H48V184M95 116V176H74M30 194H86M56 106V120"/>` + holes([[22, 30, 1.6], [93, 30, 1.6], [48, 184, 1.6], [74, 176, 1.6], [56, 120, 1.6]]))
            + slab(14, 8, 30, 12, 2, 3, 3) + slab(70, 8, 30, 12, 2, 3, 3) + slab(40, 198, 36, 14, 2, 3, 3) },
        { key: 'chips', title: 'Chips', readout: 'The processor runs everything. Storage keeps apps and photos, and the modem talks to cell towers.', zA: 3,
          parts: [{ name: 'Processor', at: [57, 72, 2.6], open: 'processor', id: 'processor' }, { name: 'Storage', at: [40, 146, 2.2] }, { name: 'Modem', at: [83, 135, 2] }, { name: 'Power chip', at: [83, 171, 1.8] }],
          draw: () => outline(0, 0, 115, 220, 10)
            + hit('processor', 'processor', 'the processor', slab(25, 40, 64, 64, 4, 0, 2.6, { top: 'chip', side: 'chip' }) + flat(2.6, `<rect x="31" y="46" width="52" height="52" fill="url(#pads)"/>`, ''))
            + slab(20, 120, 40, 52, 3, 0, 2.2, { top: 'chip', side: 'chip' })
            + slab(68, 120, 30, 30, 3, 0, 2, { top: 'chip', side: 'chip' })
            + slab(68, 160, 30, 22, 3, 0, 1.8, { top: 'chip', side: 'chip' }) },
        { key: 'memory', title: 'Memory', readout: 'Stacked right on top of the processor, so data has a short trip.', zA: 5.6,
          draw: () => slab(27, 42, 60, 60, 4, 0, 2.4, { top: 'chip2', side: 'chip' }) + flat(2.4, `<path class="light" d="M36 56H62M36 64H54"/>`, '') },
        { key: 'shield', title: 'Shield', readout: 'A thin metal lid over the chips. It keeps radio noise in and out.', zA: 3,
          draw: () => slab(12, 30, 92, 162, 6, 0, 7, { top: 'metal' })
            + flat(7, `<path d="${rr(18, 36, 80, 150, 4)}"/>` + Array.from({ length: 45 }, (_, k) => `<circle class="vent" cx="${30 + (k % 5) * 14}" cy="${52 + Math.floor(k / 5) * 14}" r="1.6"/>`).join('')) },
      ],
    },

    battery: {
      crumb: 'Battery', heading: 'Inside the battery', gap: [92, 76],
      alt: 'A phone battery taken apart: the foil pouch, the anode, the separator, the cathode, and the lid with its protection board.',
      caption: 'A phone battery is a flat pouch of thin sheets. Pick a layer to see what it does.',
      layers: [
        { key: 'pouch', title: 'Pouch', readout: 'A sealed foil bag. Inside, these thin sheets repeat many times.', zA: 0,
          draw: () => slab(0, 0, 190, 186, 12, 0, 5, { top: 'foil' }) + flat(5, `<path d="${rr(10, 10, 170, 166, 8)}"/>`) },
        { key: 'anode', title: 'Anode', readout: 'Graphite on copper foil. Charging pushes lithium in here.', zA: 5,
          draw: () => slab(40, 4, 22, 14, 1, 0, .5, { top: 'foil' }) + slab(18, 18, 154, 150, 4, 0, 1.4, { top: 'graphite' })
            + flat(1.4, `<path class="light" d="M30 40H160M30 60H160M30 80H160M30 100H160M30 120H160M30 140H160"/>`, '') },
        { key: 'separator', title: 'Separator', readout: 'A thin porous film. Lithium passes through it, but the two sides never touch.', zA: 6.4,
          draw: () => slab(12, 12, 166, 162, 4, 0, .8, { top: 'film' }) + flat(.8, `<rect x="14" y="14" width="162" height="158" fill="url(#pores)" stroke="none"/>`) },
        { key: 'cathode', title: 'Cathode', readout: 'Lithium metal oxide on aluminium foil. Lithium flows back here as the phone uses power.', zA: 7.2,
          draw: () => slab(128, 4, 22, 16, 1, 0, .5, { top: 'foil' }) + slab(20, 20, 150, 146, 4, 0, 1.4, { top: 'oxide' })
            + flat(1.4, `<path class="light" d="M32 42H158M32 62H158M32 82H158M32 102H158M32 122H158M32 142H158"/>`, '') },
        { key: 'lid', title: 'Lid and protection board', readout: 'The foil lid seals the cell. The small board stops over-charging and short circuits.', zA: 8.6,
          parts: [{ name: 'Protection board', at: [95, -13, 3] }, { name: 'Cable to the logic board', at: [201, -15, 3] }],
          draw: () => slab(30, -26, 130, 26, 3, 0, 3)
            + slab(46, -21, 18, 14, 2, 3, 1.6, { top: 'chip', side: 'chip' }) + slab(72, -21, 26, 14, 2, 3, 1.6, { top: 'chip', side: 'chip' })
            + slab(160, -20, 34, 10, 2, 0, .6, { top: 'foil' }) + slab(192, -26, 18, 22, 2, 0, 3)
            + slab(0, 0, 190, 186, 12, 0, 1.6, { top: 'foil' }) + flat(1.6, `<path d="${rr(10, 10, 170, 166, 8)}"/>`) },
      ],
    },

    screen: {
      crumb: 'Screen', heading: 'Inside the screen', gap: [64, 52],
      alt: 'A small piece of the screen, magnified and taken apart into six thin layers: base film, transistors, pixels, seal, touch layer and polariser.',
      caption: 'A small piece of the screen, magnified and taken apart.',
      layers: [
        { key: 'base', title: 'Base film', readout: 'The thin plastic sheet the panel is built on.', zA: 0,
          draw: () => slab(0, 0, 170, 170, 2, 0, 3, { top: 'film' }) },
        { key: 'tft', title: 'Transistors', readout: 'A grid of tiny switches. Each one turns one light on and off.', zA: 3,
          draw: () => slab(0, 0, 170, 170, 2, 0, 1.4) + flat(1.4, `<rect x="0" y="0" width="170" height="170" fill="url(#tft)" stroke="none"/>`) },
        { key: 'pixels', title: 'Pixels', readout: 'Each pixel is a red, a green and a blue light. Mixed, they make every colour.', zA: 4.4,
          draw: () => slab(0, 0, 170, 170, 2, 0, 1.4, { top: 'panel', side: 'dark' }) + flat(1.4, `<rect x="0" y="0" width="170" height="170" fill="url(#rgb)" stroke="none"/>`) },
        { key: 'seal', title: 'Seal', readout: 'Keeps air and moisture out. The lights fade without it.', zA: 5.8,
          draw: () => slab(0, 0, 170, 170, 2, 0, 1, { top: 'glass', side: 'glass' }) },
        { key: 'touch', title: 'Touch layer', readout: 'A fine mesh that senses where your finger is.', zA: 6.8,
          draw: () => slab(0, 0, 170, 170, 2, 0, 1, { top: 'glass', side: 'glass' }) + flat(1, `<rect x="0" y="0" width="170" height="170" fill="url(#mesh)" stroke="none"/>`) },
        { key: 'polariser', title: 'Polariser', readout: 'Cuts the glare from light around you.', zA: 7.8,
          draw: () => slab(0, 0, 170, 170, 2, 0, 1.4, { top: 'polar', side: 'glass' }) + flat(1.4, `<rect x="0" y="0" width="170" height="170" fill="url(#hatch)" stroke="none"/>`) },
      ],
    },

    processor: {
      crumb: 'Processor', heading: 'Inside the processor', gap: [88, 72],
      alt: 'The processor package taken apart: solder balls, the substrate, the silicon die and the resin that seals it.',
      caption: 'The processor is a sealed package. The chip inside is smaller than a fingernail.',
      layers: [
        { key: 'balls', title: 'Solder balls', readout: 'Hundreds of tiny solder balls join the package to the logic board.', zA: 0,
          draw: () => outline(0, 0, 150, 150, 6) + grid(7, 18, 19).map(([x, y]) => cyl(x, y, 3.6, 0, 3, { top: 'metal' })).join('') },
        { key: 'substrate', title: 'Substrate', readout: 'A tiny circuit board. Its wiring spreads the die\'s contacts out to the balls.', zA: 3,
          draw: () => slab(0, 0, 150, 150, 6, 0, 4, { top: 'film' })
            + flat(4, `<path d="M16 16H58V40M134 16V62H96M16 134H62V104M134 134H100V96M75 10V28M10 75H28M140 75H122M75 140V122"/>` + holes([[58, 40, 1.8], [96, 62, 1.8], [62, 104, 1.8], [100, 96, 1.8]])) },
        { key: 'die', title: 'Silicon die', readout: 'The chip itself. Billions of transistors on a sliver of silicon.', zA: 7,
          parts: [{ name: 'Silicon die', at: [97, 97, 2.5], open: 'die', id: 'die' }, { name: 'CPU cores', at: [54, 54, 2.5] }, { name: 'Graphics', at: [96, 52, 2.5] }, { name: 'AI engine', at: [52, 96, 2.5] }],
          draw: () => hit('die', 'die', 'the silicon die', slab(35, 35, 80, 80, 2, 0, 2.5, { top: 'chip', side: 'chip' })
            + flat(2.5, [[40, 40], [55, 40], [40, 55], [55, 55]].map(([x, y]) => `<rect class="blk" x="${x}" y="${y}" width="12" height="12" rx="1"/>`).join('')
              + `<rect class="blk" x="76" y="40" width="34" height="26" rx="1"/><rect class="blk" x="40" y="76" width="26" height="34" rx="1"/>`
              + `<path class="pat-light" d="M78 80H108M78 88H108M78 96H108M78 104H108"/>`, '')) },
        { key: 'mould', title: 'Mould', readout: 'Hard resin seals the die against damp and knocks.', zA: 7,
          draw: () => slab(0, 0, 150, 150, 6, 0, 5, { top: 'chip', side: 'chip' }) + flat(5, `<circle cx="20" cy="20" r="3" class="pat-pad"/>`, '') },
      ],
    },

    die: {
      crumb: 'Silicon die', heading: 'Inside the silicon', gap: [80, 66],
      alt: 'A corner of the silicon die, magnified and taken apart: the silicon, the transistors, fine and thick copper wiring, and the bumps on top.',
      caption: 'A tiny corner of the die, magnified. Real chips stack a dozen or more wiring layers.',
      layers: [
        { key: 'silicon', title: 'Silicon', readout: 'A slice of pure silicon. The transistors are built into its surface.', zA: 0,
          draw: () => slab(0, 0, 170, 170, 2, 0, 10, { top: 'oxide' }) },
        { key: 'transistors', title: 'Transistors', readout: 'Billions of tiny switches, each over a thousand times narrower than a hair.', zA: 10,
          draw: () => slab(0, 0, 170, 170, 2, 0, 1.4, { top: 'chip', side: 'chip' }) + flat(1.4, `<rect x="0" y="0" width="170" height="170" fill="url(#fins)" stroke="none"/>`, '') },
        { key: 'fine', title: 'Fine wiring', readout: 'Thin copper wires join transistors that sit side by side.', zA: 11.4,
          draw: () => slab(0, 0, 170, 170, 2, 0, 1.4, { top: 'glass', side: 'glass' }) + flat(1.4, `<rect x="0" y="0" width="170" height="170" fill="url(#wires)" stroke="none"/>`, '') },
        { key: 'thick', title: 'Thick wiring', readout: 'Wider copper above carries power and signals across the whole chip.', zA: 12.8,
          draw: () => slab(0, 0, 170, 170, 2, 0, 2, { top: 'glass', side: 'glass' }) + flat(2, `<rect x="0" y="0" width="170" height="170" fill="url(#bus)" stroke="none"/>`, '') },
        { key: 'bumps', title: 'Bumps', readout: 'Copper bumps on top join the die to its package.', zA: 14.8,
          draw: () => outline(0, 0, 170, 170, 2) + grid(6, 20, 26).map(([x, y]) => cyl(x, y, 5, 0, 3.5, { top: 'metal' })).join('') },
      ],
    },

    pixel: {
      crumb: 'Pixel', heading: 'Inside four pixels', gap: [84, 70],
      alt: 'Four pixels of the image sensor, magnified and taken apart: the wiring, the light-catching silicon, red, green and blue filters, and a microlens on each.',
      caption: 'Four of the sensor\'s millions of pixels, magnified. Each one sees one colour.',
      layers: [
        { key: 'wiring', title: 'Wiring', readout: 'In phone sensors it sits under the silicon, so it blocks none of the light.', zA: 0,
          draw: () => slab(0, 0, 170, 170, 3, 0, 4) + flat(4, `<path d="M14 30H156M14 60H156M14 110H156M14 140H156M44 14V156M126 14V156"/>` + holes([[44, 30, 2], [126, 60, 2], [44, 110, 2], [126, 140, 2]])) },
        { key: 'diode', title: 'Photodiode', readout: 'Silicon that turns light into an electric charge. Thin walls keep each pixel\'s light apart.', zA: 4,
          draw: () => [[3, 3], [88, 3], [3, 88], [88, 88]].map(([x, y]) => slab(x, y, 79, 79, 2, 0, 10, { top: 'oxide' })).join('') },
        { key: 'filter', title: 'Colour filter', readout: 'Each lets one colour through. Half are green, as our eyes are most sensitive to green.', zA: 14,
          parts: [{ name: 'Red', at: [42, 42, 3] }, { name: 'Green', at: [127, 42, 3] }, { name: 'Blue', at: [127, 127, 3] }],
          draw: () => [[3, 3, 'red'], [88, 3, 'green'], [3, 88, 'green'], [88, 88, 'blue']].map(([x, y, c]) => slab(x, y, 79, 79, 2, 0, 3, { top: c, side: 'glass' })).join('') },
        { key: 'lens', title: 'Microlens', readout: 'A tiny dome over each pixel bends light into it.', zA: 17,
          draw: () => byDepth([[42.5, 42.5], [127.5, 42.5], [42.5, 127.5], [127.5, 127.5]]).map(([x, y]) => cyl(x, y, 38, 0, 6, { top: 'glass', side: 'glass' })
            + flat(6, `<path class="glint" d="M${x - 22} ${y - 8}A24 24 0 0 1 ${x - 4} ${y - 24}"/>`, '')).join('') },
      ],
    },

    coil: {
      crumb: 'Charging coil', heading: 'Inside the charging coil', gap: [92, 76],
      alt: 'The wireless charging parts taken apart: a flat copper coil, a ferrite sheet, and a ring of magnets.',
      caption: 'Wireless charging works through the glass back, with no metal contacts.',
      layers: [
        { key: 'copper', title: 'Copper coil', readout: 'The charger\'s magnetic field makes a current flow in this coil. Its cable takes the power to the logic board.', zA: 0,
          parts: [{ name: 'Coil', at: [90 + 60 * K, 90 + 60 * K, 1.6] }, { name: 'Cable', at: [203, 90, 3] }],
          draw: () => solid({ d: circ(90, 90, 80) + circ(90, 90, 26), evenodd: true, bounds: [10, 10, 170, 170], tan: cTan(90, 90, 80), h: 1.6 })
            + flat(1.6, rings(90, 90, Array.from({ length: 12 }, (_, k) => 30 + k * 4)))
            + slab(170, 86, 26, 8, 2, 0, .6, { top: 'foil' }) + slab(194, 80, 18, 20, 2, 0, 3) },
        { key: 'ferrite', title: 'Ferrite sheet', readout: 'Steers the magnetic field into the coil and away from the parts above.', zA: 1.6,
          draw: () => slab(0, 0, 180, 180, 8, 0, 1.6, { top: 'graphite' }) },
        { key: 'magnets', title: 'Magnets', readout: 'Some phones add a ring of magnets that lines the charger up with the coil.', zA: 3.2,
          draw: () => outline(0, 0, 180, 180, 8)
            + byDepth(Array.from({ length: 18 }, (_, k) => [90 + 80 * Math.cos(k * Math.PI / 9), 90 + 80 * Math.sin(k * Math.PI / 9)]))
              .map(([x, y]) => cyl(f(x), f(y), 6, 0, 3, { top: 'magnet' })).join('') },
      ],
    },
  },
});
