import {omit} from "lodash/fp";
import {AuthMachine} from "../authMachine";
import {oidc_dr_service} from "./oidc_dr_service";

function toMfa(tokenDetails: any) {
    return {
    ...{...tokenDetails.sub_id?.sub_id || {}},
    ...omit('sub_id', tokenDetails || {})    
    } 
}

async function getJwt(payload: any) {
    return "idtoken"
}

export const withOdcNodeClient= (authMachine:AuthMachine)=>authMachine.withConfig({
    services: {
        // oidc_dr_service: oidc_dr_service,
       
        getToken: async (ctx, event) => {
            const payload = omit("type", event);
            const idToken = await getJwt(payload);
            const tokenDetails= decodeJwt(idToken as string);

            const mfaToken = decodeJwt(idToken as string);
            const forMfa = toMfa(mfaToken);
            delete  mfaToken.sub_id;
            delete  mfaToken.amr;
            delete  mfaToken.email;
            mfaToken.sub_ids = [forMfa];
            
            return { idToken: {raw: idToken, details:tokenDetails}, mfaToken, access_token:btoa(JSON.stringify(mfaToken))   };
        },

        enrichToken: async (ctx, event) => {
            const payload = omit("type", event);
            const idToken = await getJwt(payload);
            const tokenDetails= decodeJwt(idToken as string); 
            const mfaToken = ctx.mfaToken;
            const forMfa = toMfa( decodeJwt(idToken as string));
            mfaToken.sub_ids = [...mfaToken.sub_ids, forMfa];
             return { idToken:  {raw: idToken, details:tokenDetails}, mfaToken, access_token:btoa(JSON.stringify(mfaToken)) };

            function decodeJwt(token?:string) {

                return token && token.split && JSON.parse(atob(token.split('.')[1]));

            }  
         

            
        },
       
     
    },
    actions: {
       
    }
});

function decodeJwt(token?:string) {

    return token && token.split && JSON.parse(atob(token.split('.')[1]));

}  