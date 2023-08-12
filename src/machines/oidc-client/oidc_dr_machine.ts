import {Machine, assign, interpret, send} from "xstate";
import {Issuer, BaseClient, Client, ClientOptions} from "openid-client";

export type DrContext = { client?: Client, issuer?: Issuer, error?: string, errorType?: string, config: {discovery?:string} & Partial<ClientOptions> };

export const drMachine =(discoveryUrl?:string)=> Machine<DrContext>(
    {
        id: "useDr",
        initial: "init",
        context: {
            issuer: undefined,
            client: undefined,
            error: undefined,
            errorType: undefined,
            config: {
                discovery: discoveryUrl
            }
        },
        
        on:{
            SET_CONFIG: {
                actions: ["setConfig"],
                target: "discovering"
            }
        },
        states: {
            init: { 
                on:{
                    '*':[
                        {
                            cond: (context, event) => typeof context.config?.discovery !== "undefined",

                            target:"discovering"
                        }
                    ]
                } 
            },
            discovering: {
                invoke: {
                    src: 'oidc_discovery',
                    onDone: {actions: ["discoveryDone"], target: "issuer"},
                    onError: {target: "error"}
                },
                on: {
                    ERROR: "error",
                    ISSUER: {actions: ["setIssuer"], target: "issuer"}
                    
                },
                entry: ["startDiscovering"],
                exit: ["stopDiscovering"]
            },
            issuer: {
                on: {
                    ERROR: "error",
                    REGISTER: "registering"
                },
                entry: ["startMetadata"],
                exit: ["stopMetadata"]
            },
            registering: {
                invoke: {
                    id: "dcr-service",
                    src: 'register',
                    onDone: {
                        target: "client"
                    },
                    onError: {
                        target: "error"
                    }
                },
                entry: ["startRegistering"],
                exit: ["stopRegistering"]
            },
            client: { 
                entry: ["onClient", "saveToLocalStorage"],
                on: {
                    "CLEAR":{
                        actions: ["clearClientFromContext", "clearLocalStorage"]
                    }
                }
                
            },
            error: {
                entry: [
                    "saveErrorToContext",
                    "clearClientFromContext",
                    "clearLocalStorage"
                ]
            }
        }
    },
    {
        actions: {

            setIssuer: assign( {
                issuer:(context, event) =>{
                    const {issuer} = event.data ? event.data : event;
                     return issuer;
                } 
            }),
            setClient: assign( {
                client:(context, event) =>{
                    const {client} = event.data ? event.data : event;
                    return client;
                }
            }),
            clearClientFromContext: assign(  { 
                    client:(context, event) => undefined
               
            }),
            saveToLocalStorage: (context, event) => {
                const {issuer, client} = context;

                if (typeof localStorage !== "undefined") {
                    localStorage.setItem(
                        "useDr:issuer:metadata", JSON.stringify(issuer?.metadata || {})
                    );
                    localStorage.setItem(
                        "useDr:client:metadata", JSON.stringify(client?.metadata || {})
                    );
                }
            },
            clearLocalStorage: () => {
                if (typeof localStorage !== "undefined") {
                    localStorage.removeItem("useDr:issuer:metadata");
                    localStorage.removeItem("useDr:client:metadata");
                }
            },
            saveErrorToContext: assign((context, event) => {
                return {
                    errorType: event.errorType,
                    error: event.error
                };
            }),
            setConfig: assign((context, event) => {
                return {
                    config: {
                        ...context.config,
                        ...event
                    }
                };
            })
        }
    }
);

// check localstorage and login as soon as this file loads
export function hydrateDrFromLocalStorage(send: any) {
    if (typeof localStorage !== "undefined") {
        const issMetadata= localStorage.getItem("useDr:issuer:metadata");
        const issuer= issMetadata && new Issuer(JSON.parse(issMetadata));
        if(issuer){
            send("ISSUER", {issuer: issuer});
            const clientMetadata= localStorage.getItem("useDr:client:metadata");
            if(clientMetadata){
                send("Client", {client: new issuer.Client(JSON.parse(clientMetadata))} )
            }

            }

    }
}

export const drService = interpret(drMachine());
drService.start();

hydrateDrFromLocalStorage(drService.send);
