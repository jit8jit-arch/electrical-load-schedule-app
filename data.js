window.APP_DATA = {
  breakerStandards: [6,10,16,20,25,32,40,50,63,80,100,125,160,200,225,250,300,350,400],
  profiles: {
    "DEWA Standard": {
      lugType: "Cu crimp lug",
      glandFinish: "Brass compression gland",
      note: "Default profile based on attached standards."
    },
    "Project Standard A": {
      lugType: "Tinned Cu lug",
      glandFinish: "Nickel plated brass gland",
      note: "Editable local profile for your own standard."
    },
    "Project Standard B": {
      lugType: "Heavy duty Cu lug",
      glandFinish: "Double compression gland",
      note: "Editable local profile for your own standard."
    }
  },
  cableTables: {
    single: [
      {maxLoad: 15, cableSize: 2.5, breaker: 15},
      {maxLoad: 20, cableSize: 4, breaker: 20},
      {maxLoad: 25, cableSize: 6, breaker: 25},
      {maxLoad: 30, cableSize: 6, breaker: 30},
      {maxLoad: 40, cableSize: 10, breaker: 40},
      {maxLoad: 50, cableSize: 16, breaker: 50},
      {maxLoad: 60, cableSize: 25, breaker: 60},
      {maxLoad: 80, cableSize: 35, breaker: 80},
      {maxLoad: 100, cableSize: 50, breaker: 100},
      {maxLoad: 125, cableSize: 70, breaker: 125},
      {maxLoad: 160, cableSize: 95, breaker: 160}
    ],
    pvc: [
      {maxLoad: 15, cableSize: 2.5, breaker: 15},
      {maxLoad: 20, cableSize: 4, breaker: 20},
      {maxLoad: 30, cableSize: 6, breaker: 30},
      {maxLoad: 40, cableSize: 10, breaker: 40},
      {maxLoad: 50, cableSize: 16, breaker: 50},
      {maxLoad: 60, cableSize: 25, breaker: 60},
      {maxLoad: 80, cableSize: 35, breaker: 80},
      {maxLoad: 100, cableSize: 50, breaker: 100},
      {maxLoad: 125, cableSize: 70, breaker: 125},
      {maxLoad: 160, cableSize: 95, breaker: 160},
      {maxLoad: 180, cableSize: 120, breaker: 180},
      {maxLoad: 200, cableSize: 150, breaker: 200},
      {maxLoad: 250, cableSize: 185, breaker: 250},
      {maxLoad: 300, cableSize: 240, breaker: 300},
      {maxLoad: 350, cableSize: 300, breaker: 350},
      {maxLoad: 400, cableSize: 400, breaker: 400}
    ],
    xlpe: [
      {maxLoad: 50, cableSize: 10, breaker: 50},
      {maxLoad: 60, cableSize: 16, breaker: 60},
      {maxLoad: 80, cableSize: 25, breaker: 80},
      {maxLoad: 100, cableSize: 35, breaker: 100},
      {maxLoad: 125, cableSize: 50, breaker: 125},
      {maxLoad: 160, cableSize: 70, breaker: 160},
      {maxLoad: 200, cableSize: 95, breaker: 200},
      {maxLoad: 225, cableSize: 120, breaker: 225},
      {maxLoad: 250, cableSize: 150, breaker: 250},
      {maxLoad: 300, cableSize: 185, breaker: 300},
      {maxLoad: 350, cableSize: 240, breaker: 350},
      {maxLoad: 400, cableSize: 300, breaker: 400}
    ]
  },
  isolators: [
    {maxCurrent:25, model:"ABB KSE325TPN", poles:"3P+N", glandEntry:"2xM25 / 2xM25", cableRange:"up to 10 mm²"},
    {maxCurrent:40, model:"ABB KSE340TPN", poles:"3P+N", glandEntry:"2xM32 / 2xM32+M16", cableRange:"up to 25 mm²"},
    {maxCurrent:63, model:"ABB KSE363TPN", poles:"3P+N", glandEntry:"2xM40 / 2xM40+M16", cableRange:"up to 45 mm² AC-23A"},
    {maxCurrent:80, model:"ABB KSE380TPN", poles:"3P+N", glandEntry:"2xM40 / 2xM40+M16", cableRange:"up to 58 mm² AC-23A"},
    {maxCurrent:125, model:"ABB KSE3125TPN", poles:"3P+N", glandEntry:"2xM40 / 2xM40+M16", cableRange:"up to 70 mm² AC-23A"}
  ],
  glandMap: [
    {maxCable:6, gland:"M20 brass gland"},
    {maxCable:16, gland:"M25 brass gland"},
    {maxCable:35, gland:"M32 brass gland"},
    {maxCable:70, gland:"M40 brass gland"},
    {maxCable:120, gland:"M50 brass gland"},
    {maxCable:400, gland:"M63 brass gland"}
  ],
  lugMap: [
    {maxCable:6, lug:"Cu lug 6 mm²"},
    {maxCable:10, lug:"Cu lug 10 mm²"},
    {maxCable:16, lug:"Cu lug 16 mm²"},
    {maxCable:25, lug:"Cu lug 25 mm²"},
    {maxCable:35, lug:"Cu lug 35 mm²"},
    {maxCable:50, lug:"Cu lug 50 mm²"},
    {maxCable:70, lug:"Cu lug 70 mm²"},
    {maxCable:95, lug:"Cu lug 95 mm²"},
    {maxCable:120, lug:"Cu lug 120 mm²"},
    {maxCable:150, lug:"Cu lug 150 mm²"},
    {maxCable:185, lug:"Cu lug 185 mm²"},
    {maxCable:240, lug:"Cu lug 240 mm²"},
    {maxCable:300, lug:"Cu lug 300 mm²"},
    {maxCable:400, lug:"Cu lug 400 mm²"}
  ]
};