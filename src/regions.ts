export const REGIONS = [
  {id:'riyadh',name:'منطقة الرياض'}, {id:'makkah',name:'منطقة مكة المكرمة'},
  {id:'madinah',name:'منطقة المدينة المنورة'}, {id:'eastern',name:'المنطقة الشرقية'},
  {id:'asir',name:'منطقة عسير'}, {id:'qassim',name:'منطقة القصيم'},
  {id:'tabuk',name:'منطقة تبوك'}, {id:'hail',name:'منطقة حائل'},
  {id:'northern',name:'منطقة الحدود الشمالية'}, {id:'jazan',name:'منطقة جازان'},
  {id:'najran',name:'منطقة نجران'}, {id:'bahah',name:'منطقة الباحة'},
  {id:'jawf',name:'منطقة الجوف'},
] as const;
export const isRegion = (value: unknown): value is string => REGIONS.some(region=>region.id===value);
export const regionName = (id: string) => REGIONS.find(region=>region.id===id)?.name ?? id;
