(function(){
  const data = window.APP_DATA;

  function nextStandardBreaker(value){
    return data.breakerStandards.find(x => x >= value) || data.breakerStandards[data.breakerStandards.length - 1];
  }

  function pickFromTable(load, cableType){
    const table = data.cableTables[cableType];
    return table.find(row => load <= row.maxLoad) || table[table.length - 1];
  }

  function earthCable(size){
    if (size <= 16) return size;
    if (size <= 35) return 16;
    if (size <= 70) return 35;
    if (size <= 120) return 70;
    return 120;
  }

  function pickGland(size){
    return data.glandMap.find(x => size <= x.maxCable)?.gland || "Manual check";
  }

  function pickLug(size){
    return data.lugMap.find(x => size <= x.maxCable)?.lug || "Manual check";
  }

  function pickIsolator(breaker){
    return data.isolators.find(x => breaker <= x.maxCurrent) || data.isolators[data.isolators.length - 1];
  }

  function breakerFamily(breaker){
    return breaker <= 63 ? "MCB / RCBO range" : "MCCB range";
  }

  function elcbType(systemType, breaker){
    const poles = systemType === "1ph" ? "2P" : "4P";
    return `${poles} ELCB/RCCB ${Math.min(Math.max(breaker, 25), 125)} A, 30/100/300 mA as required`;
  }

  function distanceNote(distance){
    if (distance <= 30) return "Distance is short; basic selection usually acceptable subject to final voltage drop check.";
    if (distance <= 60) return "Distance is moderate; verify voltage drop before final approval.";
    return "Distance is long; cable may need upsizing after voltage drop check.";
  }

  window.computeSelection = function(input){
    const load = Number(input.loadCurrent || 0);
    const distance = Number(input.distance || 0);
    const cableType = input.cableType;
    const systemType = input.systemType;

    const tablePick = pickFromTable(load, cableType);
    const breaker = nextStandardBreaker(tablePick.breaker);
    const cableSize = tablePick.cableSize;
    const ecc = earthCable(cableSize);
    const gland = pickGland(cableSize);
    const lug = pickLug(cableSize);
    const isolator = pickIsolator(breaker);
    const poles = systemType === "1ph" ? "2P" : "4P";
    const breakerType = breakerFamily(breaker);

    return {
      equipmentName: input.equipmentName || "Equipment",
      loadCurrent: load,
      distance,
      systemType: systemType === "1ph" ? "1 Phase" : "3 Phase",
      cableTypeLabel: cableType === "xlpe" ? "Armoured XLPE Cu" : cableType === "pvc" ? "Armoured PVC Cu" : "Single Core PVC Cu",
      cableSize: `${cableSize} mm²`,
      earthCable: `${ecc} mm²`,
      breaker: `${poles} ${breakerType} ${breaker} A`,
      elcb: elcbType(systemType, breaker),
      isolator: `${isolator.model} (${isolator.poles})`,
      glands: gland,
      lugs: lug,
      note: distanceNote(distance),
      sourceNote: "Selection uses the simplified DEWA table logic from the attached standards and ABB isolator catalogue."
    };
  };
})();