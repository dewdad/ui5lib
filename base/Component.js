(function () {
    $.sap.declare('ui5lib.Component');
    ui5lib.Component = {};
    ui5lib.Component.extend = function(modName, impl){
        $.sap.declare(modName);
        return sap.ui.core.UIComponent.extend(modName,
            mashup(
                impl,
                {
                    init: function () {
                        var busy, endpoint, router;
                        jQuery.sap.require("sap.m.routing.RouteMatchedHandler");
                        sap.ui.core.UIComponent.prototype.init.apply(this, arguments);

                        // Init Router
                        /*this.routeHandler = new sap.m.routing.RouteMatchedHandler(this.getRouter());*/
                        this.getRouter().initialize();

                        // oData endpoint init
                        endpoint = sap.ui.model.odata.ODataModel(this.getConfig("serviceConfig.serviceUrl"), true);
                        this.setModel(endpoint);

                        // i18n model init
                        var i18nModel = new sap.ui.model.resource.ResourceModel({
                            bundleUrl : [this.getRootPath(), this.getConfig("resourceBundle")].join("/"),
                            locale : sap.ui.getCore().getConfiguration().getLanguage()
                        });
                        this.setModel(i18nModel, "i18n");
                        sap.ui.getCore().setModel(i18nModel, "i18n");
                        /*busy = new sap.m.BusyDialog({ // TODO: REFACTOR so if the control requesting the data can be referenced through the load dispatch then make it busy
                         title: "Loading data"
                         });
                         endpoint.attachRequestSent(function () {
                         return busy.open();
                         });
                         return endpoint.attachRequestCompleted(function () {
                         return busy.close();
                         });*/
                    },
                    getConfig: function(sPath){
                        return getObjProperty(this.getMetadata().getConfig(), sPath);
                    },
                    getRootPath: function(){
                        return jQuery.sap.getModulePath(this.getName());
                    },
                    getName: function(){
                        var md = this.getMetadata();
                        return md._sComponentName || md._sLibraryName;
                    },
                    destroy: function () {
                        /*if (this.routeHandler) {
                         this.routeHandler.destroy();
                         }*/
                        try{
                            this.getRouter().destroy();
                            return sap.ui.core.UIComponent.prototype.destroy.apply(this, arguments);
                        }catch(e){

                        }

                    }/*,
                     createContent: function () {
                     var view;
                     view = sap.ui.view({
                     id: "app",
                     viewName: "view.App",
                     type: "JS",
                     viewData: {
                     component: this
                     }
                     });
                     return view;
                     }*/
                },
                ['init']
            )
        );
    }

}).call(this);
