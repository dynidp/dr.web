import {Issuer, BaseClient} from "openid-client";
import {AuthMachineContext, AuthMachineEvents, OIDC_RR_Payload} from "../authMachine";

export const oidc_dr_service = async (ctx: AuthMachineContext, event: AuthMachineEvents) => {

    if (event.type == "OIDC.DR") {
        const issuer = await Issuer.discover(event.issuer);
        const {Client} = issuer;
        // @ts-ignore
        return await Client.register({}) as any;

    }

}


export const oidc_discovery = async (ctx: AuthMachineContext, event: AuthMachineEvents, {data }:{data:OIDC_RR_Payload}):Promise<Issuer> => {

    const {issuer}=data;
    return  await Issuer.discover(issuer);
    

}
