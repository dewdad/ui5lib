/**
 * This function serves the as typed typed controllers, but provides allot more, it offers a simple extension mechanism from
 * the first object produced by this method. It does not to override constructors and onInit methods, but rather chains them.
 * @param sExtName
 * @param extImpl
 * @param baseName
 */
function extendController (sExtName, extImpl, baseName){
    baseName = baseName || "sap.ui.core.mvc.Controller";
    /* boilerplate code for typed Controller */
    jQuery.sap.declare({modName:sExtName, type:"controller"}); // declaring a special type of module
//    var extension = getObjProperty(window,sExtName,false);
        //eval(sExtName+' = function(){'+baseName+'.apply(this, arguments);}');
    setProperty(this, function () { // the constructor
        getObjProperty(window,baseName,false).apply(this, arguments);
        var ctor = getObjProperty(extImpl,'constructor',false);
        if(!!ctor){
            ctor.apply(this, arguments);
            //delete extImpl['constructor'];
        }
    }, sExtName);

    jQuery.sap.require("sap.ui.core.mvc.Controller"); // this is currently required, as the Controller is not loaded by default

    //eval(sExtName+'.prototype = jQuery.sap.newObject('+baseName+'.prototype)'); // chain the prototypes
    getObjProperty(window,sExtName,false).prototype = jQuery.sap.newObject(getObjProperty(window,baseName,false).prototype); // chain the prototypes
    /* end of boilerplate code for typed Controller */
    getObjProperty(window,sExtName,false).extend = function(sExtendingName, oImpl) {
        return extendController(sExtendingName, oImpl, sExtName);
    };

    getObjProperty(window,sExtName,false).prototype.onInit = function() {
        try{getObjProperty(window,baseName,false).prototype.onInit.apply(this, arguments)}catch(e){}
        var onInit = getObjProperty(extImpl, 'onInit', false);
        if(!!onInit) onInit.apply(this, arguments);
    };

    $.each(extImpl, function(key,value){
        if(!inArray(key, ['onInit', 'constructor'])) getObjProperty(window, sExtName, false).prototype[key] = value;
    });
};

(function(){

    var resourceName = "ui5lib.Controller";
    var baseController =  {
        onInit: function(){
            console.log("Base Controller Init for ", this.myName());
            this._initCustomFilters();
            this._initValidValues();

            this.router = this.getRouter();

            // Route handling
            this.getRouter().attachRouteMatched(function(evt){
                var routeName = evt.getParameter("name");
                if(this.isMyRoute(routeName)){
                    // When the route for the current view is matched
                    this.onMyRouteMatched && this.onMyRouteMatched.apply(this, arguments);
                }
                this.onRouteMatched && this.onRouteMatched.apply(this, arguments);
            }, this);
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
        myName: function(){
            return this.getView().getControllerName().split('.').pop();
        },
        getViewName: function(){
          return this.getView().getViewName();
        },
        isMyRoute: function(routeName){
          var routeView = getObjProperty(this.getRouter(),"_oRoutes."+routeName+"._oConfig.view");
          return new RegExp(routeView+'$').test(this.getViewName());
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
                        oValue || sPath);
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
    extendController(resourceName, baseController);
}.call(this));