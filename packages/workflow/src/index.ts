export type WorkflowRunStatus = "PENDING"|"RUNNING"|"SUCCEEDED"|"FAILED"|"CANCELLED";
export type WorkflowStepType = "CONDITION"|"ACTION"|"NOTIFICATION";
export type WorkflowStep = { key:string; order:number; type:WorkflowStepType; configuration:Record<string,unknown> };
export type WorkflowDefinition = { key:string; version:number; steps:WorkflowStep[] };
export type WorkflowContext = { input:Record<string,unknown>; output:Record<string,unknown>; correlationId:string };
export type WorkflowAction = (ctx:WorkflowContext, configuration:Record<string,unknown>)=>Promise<Record<string,unknown>>;
export type WorkflowExecution = { status:WorkflowRunStatus; output:Record<string,unknown>; failedStep?:string; error?:string };

export function validateWorkflow(definition:WorkflowDefinition):void {
  if(!definition.key.trim()) throw new Error("workflow key is required");
  if(!Number.isInteger(definition.version)||definition.version<1) throw new Error("workflow version must be a positive integer");
  const orders=definition.steps.map(s=>s.order);
  if(new Set(orders).size!==orders.length) throw new Error("workflow step order must be unique");
  if(new Set(definition.steps.map(s=>s.key)).size!==definition.steps.length) throw new Error("workflow step keys must be unique");
}
export async function executeWorkflow(definition:WorkflowDefinition, context:WorkflowContext, actions:Record<string,WorkflowAction>):Promise<WorkflowExecution>{
  validateWorkflow(definition);
  const output={...context.output};
  const sorted=[...definition.steps].sort((a,b)=>a.order-b.order);
  try{
    for(const step of sorted){
      if(step.type==="CONDITION"){
        const field=String(step.configuration.field??"");
        const expected=step.configuration.equals;
        if(context.input[field]!==expected) return {status:"SUCCEEDED",output};
      } else {
        const actionName=String(step.configuration.action??"");
        const action=actions[actionName];
        if(!action) throw new Error(`workflow action not registered: ${actionName}`);
        Object.assign(output,await action({...context,output},step.configuration));
      }
    }
    return {status:"SUCCEEDED",output};
  }catch(error){
    return {status:"FAILED",output,failedStep:sorted.find(s=>s.type!=="CONDITION")?.key,error:error instanceof Error?error.message:String(error)};
  }
}
