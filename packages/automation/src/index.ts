export type AutomationEvent = { tenantId:string; eventType:string; eventId:string; payload:Record<string,unknown> };
export type AutomationRule = { key:string; triggerEvent:string; enabled:boolean };
export type AutomationDecision = { matched:boolean; dedupeKey:string };
export function matchAutomation(rule:AutomationRule,event:AutomationEvent):AutomationDecision{
  if(!rule.enabled||rule.triggerEvent!==event.eventType) return {matched:false,dedupeKey:""};
  if(!rule.key.trim()||!event.eventId.trim()) throw new Error("automation key and event id are required");
  return {matched:true,dedupeKey:`${rule.key}:${event.eventId}`};
}
