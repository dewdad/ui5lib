(function(){
    jQuery.sap.require("sap.m.routing.RouteMatchedHandler");
    jQuery.sap.require("sap.ui.core.routing.Router");

    (function(fn){
        sap.ui.core.routing.Router.prototype.attachRouteMatched = function(){
            if(!this._RouteMatchedSubscribers) this._RouteMatchedSubscribers = [];

            if(!inArray(arguments, this._RouteMatchedSubscribers)){
                fn.apply(this, arguments);
                this._RouteMatchedSubscribers.push(arguments);
                console.debug('Listener attatched to routing', arguments);
            }
        }
    }(sap.ui.core.routing.Router.prototype.attachRouteMatched))

    var resourceName = "ui5lib.Controller";
    var baseController =  {
        onInit: function(){
            console.log("Base Controller Init for ", this.myName());
            this._initCustomFilters();
            this._initValidValues();

            this.router = this.getRouter();

            // Route handling
            if(!!this.onRouteMatched) {
                this.router.attachRouteMatched(this.onRouteMatched, this);
            }
            
            if(!!this.onMyRouteMatched) {
                this.router.attachRouteMatched(function(evt){
                    var routeName = evt.getParameter("name");
                    if(this.isMyRoute(routeName)) {
                        this.onMyRouteMatched.apply(this, arguments);
                    }
                }, this);
            }

        },
        _initCustomFilters: function(){
            if(!!this._customFiltersObj) this.setViewModelProperty('customFilters',this._customFiltersObj());
        },
        /**
         * Note the at for this to initialize the valid values required by a controller there must be
         * an implementation of loadValidValues in on the inheritance path
         * @private
         */
        _initValidValues: function(){
            if(!this.loadValidValues) return; // Check for implementation of loadValidValues

            var vVFields = this._validValues;
            var that = this;
            if(!!vVFields){
                vVFields.forEach(function(el){
                    var entity, field, validValues;

                    entity = el.entity;
                    field = el.field;

                    validValues = that.getViewModelProperty('/validValues/'+entity+'/'+field);

                    if(!validValues){
                        // !! validValues needs to be implemented on the Application's base controller
                        that.loadValidValues(entity, field, function(validValues){
                            that.setViewModelProperty('/validValues/'+entity+'/'+field, validValues);
                        });
                    }
                });
                //this.setViewModelProperty('customFilters',this._customFiltersObj());
            }
        },

        getCustomFilters: function(){
            return this.getViewModelProperty("customFilters");
        },
        getEventBus : function () {
            var sComponentId = sap.ui.core.Component.getOwnerIdFor(this.getView());
            return sap.ui.component(sComponentId).getEventBus();
        },
        getRouter : function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },
        navTo : function() {
          var router = this.getRouter();
          return router.navTo.apply(router, arguments);
        },
        navBack: function(){
            var router = this.getRouter();
            if (!!router.myNavBack) return router.myNavBack.apply(router, arguments);
        },
        myName: function(){
            return this.getView().getControllerName().split('.').pop();
        },
        getViewName: function(){
          return this.getView().getViewName();
        },
        isMyRoute: function(routeName){
          var routeView = getObjProperty(this.getRouter(),"_oRoutes/"+routeName+"/_oConfig/view", '/');
          return new RegExp(routeView+'$').test(this.getViewName());
        },
        setModel: function(){
            var view = this.getView();
            if(!!view){
              return view.x_SetJSModel.apply(view, arguments);
            }
        },
        getJSModel: function(){
            var view = this.getView();
            var oModel = view.getModel.apply(view, arguments);
            if(!!view){
                return (oModel instanceof sap.uiext.model.json.JSONModel || oModel instanceof sap.ui.model.json.JSONModel)? oModel: undefined;
            }
        },
        setData: function(oData,sModelName){
            var jsModel = this.getJSModel(sModelName);
            var data = isArray(oData)? {data:oData}: oData;
            if(!jsModel){
                this.setModel(data);
            }else{
                jsModel.setData(data);
            }
        },
        getModelEntity: function(){
            return this._modelEntity || this.myName();
        },
        getComponentId: function(oControl){
            return sap.ui.core.Component.getOwnerIdFor(oControl || this.getView());
        },
        getComponent: function(oControl){
            return sap.ui.getCore().getComponent(this.getComponentId());
        },
        geti18nBundle: function(){
            var sComponentId = this.getComponentId();
            return sap.ui.component(sComponentId).getModel("i18n").getResourceBundle();
        },
        getText: function(){
            var i18nBundle = this.geti18nBundle();
            return i18nBundle.getText.apply(i18nBundle, arguments);
        },
        toHome : function() {
            this.getRouter().navTo("home");
        },
        hasData: function(){
            return !isEmpty(arguments[0]);
        }
    };

    var addModelMembers = function(obj, models){
        var mObj = obj;
        $.each(models, function(index, value){
            mObj['get'+capsFirst(value)+'Model'] = function(){
                var core = this.getComponent();
                if(!core.getModel(value)) {
                    core.setModel(new sap.uiext.model.json.JSONModel(), value);
                }
                return core.getModel(value);
            };

            // There is some confusing code up ahead for the getters and setters that serves to default the getters/setters'
            // contexts to '/[modelEntity || ControllerName]' unless the sPath passed to them is absolute, in which case
            // they will behave as regular [get/set]Property on their respective models
            mObj['set'+capsFirst(value)+'ModelProperty']=function(sPath, oValue){
                var oModel = this['get'+capsFirst(value)+'Model']();
                var modelRootProperty = this.getModelEntity();
                var ret = oModel.setProperty(
                    (sPath.charAt(0)==='/')
                        ?sPath
                        :('/'+modelRootProperty+((typeof(sPath)!=='string')?'':'/'+sPath)),
                        (arguments.length>1? oValue: sPath));
                oModel.checkUpdate();
                return ret;
            };
            mObj['get'+capsFirst(value)+'ModelProperty']=function(sPath){
                sPath = sPath || '';
                var oModel = this['get'+capsFirst(value)+'Model']();
                var modelRootProperty = this.getModelEntity();
                return oModel.getProperty((sPath.charAt(0)==='/')
                    ?sPath
                    :('/'+modelRootProperty+((!sPath)?'':'/'+sPath)));
            };
        });
    };

    // Call with all global model names,
    // this will produce:
    // get[ModelName]Model,
    // get[ModelName]ModelPropety,
    // set[ModelName]ModelPropety
    // methods on the base controller.
    // !!All access to global models will be done here only!!
    addModelMembers(baseController, ['view']);

    jQuery.sap.declare(resourceName);
    //sap.ui.core.mvc.Controller.extend(resourceName, baseController);
    ui5extend(resourceName, baseController, "sap.ui.core.mvc.Controller");
}.call(this));