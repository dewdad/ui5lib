// fix console access for IE
if (!window.console) window.console = {};
if (!window.console.log) window.console.log = function () { };
if (!window.console.debug) window.console.debug = function () { };
if (!window.console.info) window.console.info = function () { };

/**
 * Extends functional JavaScript in the browser. Escpecially suited for SAP/OpenUI5 applications.
 * @depdency jQuery
 *
*/

function capsFirst(capitalizeMe){
    var caps = capitalizeMe.charAt(0).toUpperCase() + capitalizeMe.slice(1);
    return caps;
}

/**
 * defines a property path in the form of 'p1.p1-1.p1-1-2'
 * if not defined in the context (optional, defaults to window).
 * @return value of path within context
 */
var declareName, propertyGetSet;
declareName = propertyGetSet = function(sPath, oContext, cDelimeter){
    cDelimeter = cDelimeter || '.';
    if(sPath.charAt(0)===cDelimeter) sPath = sPath.substr(1);
    return sPath.split(cDelimeter).reduce(function(holder, sPath){
        holder[sPath] = holder[sPath] || {};
        return holder[sPath];
    }, oContext || window);
};

// JavaScript inheritance helper function
function extend(extension, parent, extPrototype, chainMethods) {
    chainMethods = chainMethods ||[];
    extPrototype = extPrototype || [];
    function I() {};
    I.prototype = parent.prototype;
    var ctor = extension;
    extension = function(){
        parent.apply(this, arguments);
        ctor.apply(this, arguments);
    }

    extension.prototype = new I;
    extension.prototype.constructor = extension;
    extension.superprototype = parent.prototype;

    /*chainMethods.forEach(function(sName){
        extension.prototype[sName] = function() {
            try {
                parent.prototype[sName].apply(this, arguments)
            } catch (e) {
            }
            var method = extension[sName];
            if (!!method) method.apply(this, arguments);
        }
    });*/

    for (var prop in extPrototype) {
        if( extPrototype.hasOwnProperty( prop ) ) {
            if(inArray(prop,chainMethods)){
                extension.prototype[prop] = function() {
                    try {
                        parent.prototype[prop].apply(this, arguments)
                    } catch (e) {
                    }
                    var method = extPrototype[prop];
                    if (!!method) method.apply(this, arguments);
                }
            }else {
                extension.prototype[prop] = extPrototype[prop];
            }
        }
    }

    return extension;
};

function mashup(a, b, chainMethods){
    chainMethods = chainMethods ||[];
    for (var prop in b) {
        var key = prop;
        if(inArray(prop,chainMethods) && !!b[prop].call){
            var aprop = a[key];
            a[key] = function() {
                try {
                    b[key].apply(this, arguments)
                } catch (e) {
                }
                if (!!aprop && !!aprop.call) aprop.apply(this, arguments);
            }
        }else {
            a[key] = b[key];
        }
    }
    return a;
}

function setLocationHash(hash){
    hash = hash.replace( /^#/, '' );
    var fx, node = $( '#' + hash );
    if ( node.length ) {
        node.attr( 'id', '' );
        fx = $( '<div></div>' )
            .css({
                position:'absolute',
                visibility:'hidden',
                top: '0px'
            })
            .attr( 'id', hash )
            .appendTo( document.body );
    }
    document.location.hash = hash;

    if ( node.length ) {
        fx.remove();
        node.attr( 'id', hash );
    }
}


isEmpty = function(o) {

    if(!isObject(o) && !isArray(o) && !!o) return false
    else{
        for ( var p in o ) {
            if ( o.hasOwnProperty( p ) ) { return false; }
        }
    }
    return true;
};

isNotEmpty = function(o){
    return !isEmpty(o);
};

function isJsonStr(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function trim (str, delimiter) {
    var delimiter = delimiter && ('\\'+delimiter) || '';
    var part = "["+delimiter+"\\s]";
    var regex = new RegExp("^"+part+"*|"+part+"*$",'g');
    return str.replace(regex, '');
}

/**
 * Setting of object properties/deep-nested properties by path
 * equivalent of setProperty
 * @param obj The object on which to write the value
 * @param value
 * @param path '.' delimited string representing the property path on which to write
 * @param delimiter
 * @returns {*}
 */
function setProperty(obj, value, path, delimiter) {
    if(!!!arguments[2]){
        obj = value;
        return obj;
    }

    var parent = obj;
    if(delimiter==undefined || !!!delimiter.length || delimiter.length !== 1) // if delimter is not provided or is invalid
        delimiter = '.';

    path = path.toString().split(delimiter);

    for (var i = 0, pathLen = path.length -1; i < pathLen; i += 1) {
        //console.log(parent);
        if(path[i].length>0){
            if(!!!parent[path[i]]){
                parent[path[i]] = isNonNegativeNumber(path[i+1])?[]:{};
            }
            parent = parent[path[i]];
        }
    }

    parent[path[path.length-1]] = value;
    return obj;
}

/**
 * return a values array for the given object keys
 * @param {Object} obj
 * @param {Array} keys
 * @return {Array}
 */
function getValuesByKeys(obj, keys){
    var values=[];
    keys = keys || Object.keys(obj);
    for(var i = 0, keysLen = keys.length; i<keysLen; i++){
        var value = obj[keys[i]];
        if(value) values.push(value);
    }
    return values;
}

/**
 * returns object with a key/value pair for each url param
 * @return {Object}
 */
function getUrlVars(url) {
    var vars = {};
    if(!url){
        if(!!window.location.URLVars) return window.location.URLVars;
        url = window.location.href;
        window.location.URLVars = vars;
    }

    var parts = url.replace(/[?&]+([^=&#]+)=([^&#]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

/**
 * Returns a property from an object by a given path from the root. Traverses getters as well.
 * @param obj
 * @param path
 * @param bCall : boolean (default: true) Whether to call the path components if they are methods
 * @param delimiter : string (default: ".")
 * @return {*}
 */
function getObjProperty(obj, path, bCall, delimiter){
    if(!arguments[1] || !obj)
        return obj;

    var parent = obj;

    delimiter = typeof(bCall)==='string'? bCall: (delimiter || '.');
    bCall = bCall===false? false: true;

    var delimRegx = new RegExp("\\"+delimiter+'{2,}', "gi"); // fix multiple delimiters
    path = path.replace(delimRegx, delimiter);
    path = path.replace(new RegExp("\\"+delimiter+'$'), ''); // fix trailing delimiter

    path = path.split(delimiter);

    for (var i = 0, parts = path.length -1 ; i < parts ; i += 1) {
        if(path[i].length>0){
            //console.log(parent);
            parent = !!parent[path[i]] && !!parent[path[i]].call? parent[path[i]](): parent[path[i]];
            if(typeof(parent)=='undefined') return undefined;
        }
    }
    var propPath = path[path.length-1];
    return bCall && !!parent[propPath] && !!parent[propPath].call? parent[propPath](): parent[propPath];
}

function createUUID() {
    // http://www.ietf.org/rfc/rfc4122.txt
    var s = [];
    var hexDigits = "0123456789ABCDEF";
    for ( var i = 0; i < 32; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[12] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
    s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1); // bits 6-7 of the
    // clock_seq_hi_and_reserved to 01

    var uuid = s.join("");
    return uuid;
}

function mixin(dest, source, copyFunc) {
    var name, s, i, empty = {};
    for(name in source){
        // the (!(name in empty) || empty[name] !== s) condition avoids copying properties in "source"
        // inherited from Object.prototype.   For example, if dest has a custom toString() method,
        // don't overwrite it with the toString() method that source inherited from Object.prototype
        s = source[name];
        if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))){
            dest[name] = copyFunc ? copyFunc(s) : s;
        }
    }
    return dest;
}

function clone(src) {

    if(!src || typeof src != "object" || Object.prototype.toString.call(src) === "[object Function]"){
        // null, undefined, any non-object, or function
        return src;  // anything
    }
    if(src.nodeType && "cloneNode" in src){
        // DOM Node
        return src.cloneNode(true); // Node
    }
    if(src instanceof Date){
        // Date
        return new Date(src.getTime());  // Date
    }
    if(src instanceof RegExp){
        // RegExp
        return new RegExp(src);   // RegExp
    }
    var r, i, l;
    if(src instanceof Array){
        // array
        r = [];
        for(i = 0, l = src.length; i < l; ++i){
            if(i in src){
                r.push(clone(src[i]));
            }
        }
        // we don't clone functions for performance reasons
        //    }else if(d.isFunction(src)){
        //      // function
        //      r = function(){ return src.apply(this, arguments); };
    }else{
        // generic objects
        r = src.constructor ? new src.constructor() : {};
    }
    return mixin(r, src, clone);

}

function removeObjProperty(obj, path, delimiter){
    if(!!!arguments[1])
        return false;

    var parent = obj;
    if(delimiter==undefined || !!!delimiter.length || delimiter.length !== 1) // if delimter is not provided or is invalid
        delimiter = '.';

    path = path.split(delimiter);

    for (var i = 0, parts = path.length -1; i < parts; i += 1) {
        if(path[i].length>0){
            //console.log(parent);
            parent = parent[path[i]];
        }
    }
    if(jQuery.isArray(parent)){
        parent.splice(path[path.length-1],1)
    }else{
        try{
            delete parent[path[path.length-1]];
        }catch(ex){}
    }
    return obj;
}

function keysArrayToObj(aKeys, defaultValue){
    var obj={};
    for(var i= 0, len = aKeys.length; i<len; i++){
        obj[aKeys[i]] = defaultValue;
    }
    return obj;
}

function diff(template, override) {
    var ret = {};
    for (var name in template) {
        if (name in override) {
            if (isObject(override[name]) && !isArray(override[name])) {
                var diff = difference(template[name], override[name]);
                if (!isEmpty(diff)) {
                    ret[name] = diff;
                }
            } else if (!isEqual(template[name], override[name])) {
                ret[name] = override[name];
            }
        }
    }
    return ret;
}

var isEqual = function ( first, second ) {
    /* First, let’s check whether the 2 values are both primitive types because if they are both primitive types, then we can just use the '===” operator to determine whether they are deeply equal to each other. */
    /* The isPrimitive function is a helper function I defined below to help us out. */
    if ( first === second ) {
        /* If this part of the code is reached, it means that both values are primitive types. In that case, we can simply use our '===” operator to test for deep equality. */
        return true;
    }
    /* Second, if we reach this part of the code, it means that either: 1) One of the values is a primitive type while the other one isn’t, or 2) Both values are reference types */
    /* The else—if code directly below will test for the (1) scenario. */
    else if ( isPrimitive(first) || isPrimitive(second) ) {
        /* If the 2 values aren’t even the same types, then we can just return false. */
        return false;
    }
    /* Finally, if we reach this part of the code, then we know that we’re in the (2) scenario mentioned above where we are dealing with 2 reference values. */
    else {

        /* Since we know that both values are reference types, we can get the keys for each of the objects and compare their keys array. */
        var firstKeys = Object.keys( first );
        var secondKeys = Object.keys( second );

        /* Given these 2 keys arrays, we know that if they don’t even have the same lengths, then they must not be deeply equal. */
        if ( firstKeys.length !== secondKeys.length ) {
            return false;
        }

        /* At this point, we know that these 2 values have keys arrays that have the same length. We now want to check whether for EACH of the keys, both objects have the same corresponding values. */
        else {
            for ( var prop in first ) {
                /* We know both keys arrays have the same length, but do they have the same keys in both arrays? This test checks for that. */
                if ( second[prop] === undefined ) {

                    /* If we can’t the same key in both objects, then we know the two objects are not deeply equal. */
                    return false;
                }
                /* At this point, we see that both objects have the same particular key but are there corresponding values deeply equal? Well, would you look at that — this is a recursive problem! If we determine that for this particular key, the 2 object’s corresponding values are not deeply equal, then we know that the 2 object’s are also not deeply equal. */
                else if (!isEqual(first[prop], second[prop])) {
                    return false;
                }
            }

            /* If the code reaches this point, then we know we’ve gone through all the key / value pairs in both objects and all their key / value pairs are deeply equal — we can then return true. */
            return true;
        }
    }
};
/* This is a helper function to help us determine whether a JavaScript value is a primitive type. */
var isPrimitive = function ( value ) {
    return (value === void 0 || value === null || typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'string');
}

function isObject(value){
    return $.isPlainObject(value);
}

function isArray(value){
    return value instanceof Array;
}

/**
 *  Takes extract an array/object by template from the src, will remove
 *  template from source if splice is set to true.
 * @param {Object|Array} src
 * @param {Object|Array} template
 * @param {booleran} splice
 * @return {Object|Array} extracted template from source
 * @dependent Prototype library (_isArray, _isObject)
 */
function extractTemplate(src, template, splice){

    if(!src) return undefined;

    var extraction=$.isArray(template)?[]:{}, tmpval;

    if($.isArray(template)){
        if(!$.isArray(src)) return false;
        for (var i = 0, srcLen = src.length ; i < srcLen ; i++) {
            if(tmpval=extractTemplate(src[i],template[0], splice))
                extraction[i]=tmpval;
        }
    }else{
        for( var key in template )
            if( src.hasOwnProperty(key) ){
                if(isObject(template[key]) || $.isArray(template[key])){
                    if(isObject(src[key]) || $.isArray(template[key]))
                        extraction[key] = extractTemplate(src[key], template[key], splice);
                }else{
                    extraction[key] = src[key];
                    if(splice){
                        delete src[key];
                    }
                }
            }
    }
    return extraction;
}

function mergeOverwriteDst(dst, src){
    for (var key in src) {
        if(src.hasOwnProperty(key))
            dst[key]=src[key];
    }
}

function updateObj(dst, src){
    for (var key in dst) {
        if(src.hasOwnProperty(key))
            dst[key]=src[key];
    }
}

/**
 * takes a destination object and a source object and updates
 * missing properties from source to destination, good for integrating defaults
 * @param {Object} dst destination object
 * @param {Object} objsource object
 */
mergeDiff = function (dst, obj) {
    if (typeof obj !== 'object' && typeof obj !== 'function' || obj === null) throw new TypeError('Object.keys called on non-object')

    for(prop in obj){
        if(!dst.hasOwnProperty(prop)){
            dst[prop] = obj[prop];
        }
    }
    return dst;
};

function indexOfKeyValue(array,key,value){
    for (var i = 0; i < array.length; i++) {
        if(isEqual(array[i][key], value) )
            return i;
    }
    return -1;
}

//  discuss at: http://phpjs.org/functions/dirname/
//   example 1: dirname('/etc/passwd');
//   returns 1: '/etc'
//   example 2: dirname('c:/Temp/x');
//   returns 2: 'c:/Temp'
//   example 3: dirname('/dir/test/');
//   returns 3: '/dir'
var parentPath, dirname;
parentPath = dirname = function(sPath){
    return sPath.replace(/\\/g, '/').replace(/\/[^\/]*\/?$/, '');
}

function sort (prop, arr) {
    prop = prop.split('.');
    var len = prop.length;

    arr.sort(function (a, b) {
        var i = 0;
        while( i < len ) { a = a[prop[i]]; b = b[prop[i]]; i++; }
        if (a < b) {
            return -1;
        } else if (a > b) {
            return 1;
        } else {
            return 0;
        }
    });
    return arr;
}

/**
 *
 * @param obj array or object to be queried for key value pair
 * @param key
 * @param value
 * @param index a reference passed in that will be set to -1 if the pair is not found or the obj is not indexable, or the index otherwise
 * @return {item: object, index: int}|null
 */
function findByKey(obj, key, value, bCall){
    if(!key || isEqual(typeof(obj[key])==='function' && bCall ? obj[key].call(obj) : obj[key], value )) {
        return {item: obj, index:null};
    }
    if(!!obj.length){
        return  arrayFindByKey(obj,key,value, bCall);
    }
    return null;
}


function arrayFindByKey(array,key,value, bCall){
    if(!array || !array.length) return undefined;
    for (var i = 0, arrLen = array.length; i < arrLen; i++) {
        var item = array[i][key];
        if(isEqual(typeof(item)==='function' && bCall ? item.call(array[i]) : item, value ) ){
            return {item: array[i], index: i};
        }
    }
    return {item: undefined, index: undefined};
}

/**
 * arrayFindByPath allows you to search on an array using complex property paths e.g "size.height.getHeightByPixel"
 * @param array array to search on
 * @param {string} path
 * @param {*} value
 * @param {boolean} index whether to return an index or value
 * @param {string} [delimiter = '.']
 * @return {int|*} if index argument is set then the method will return the index of the found element, otherwise the element itself
 */
function arrayFindByPath(array,path,value, index, delimiter){
    for (var i = 0, arrLen = array.length; i < arrLen; i++) {
        var item = getObjProperty(array[i], path, delimiter);
        if(isEqual(typeof(item)==='function' ? item.call(array[i]) : item, value ) )
            return !!index? i: array[i];
    }
    return null;
}

function removeFromArray(arr, remove) {
    remove = isArray(remove)? remove: [remove];
    var what, a = arguments, L = remove.length, ax;

    while (L > 0 && arr.length) {
        what = remove[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}

function isNumeric(test){
    return jQuery.isNumeric(test);
}

function isNonNegativeNumber(test){
    return isNumeric(test) && test>-1;
}

var validate={

    /**
     * first argument can be notifier a function taking a string message, the rest
     * should be in form of {value: val|[val1, val2], validator: handler}
     * @return {*}
     */
//    validationError: function(){
//        for(var i=0; arguments.length>i; i++){
//            var validation = arguments[i];
//            if(!isArray(validation.value)) validation.value = [validation.value];
//            var isValid = validation.validator.apply(null, validation.value);
//            if(!isValid){
//                return (!!validation.message && validatione.message) || true;
//            }
//        }
//        return false;
//    },
    /**
     *  Validates that a string contains only valid integer number.
     * @param strValue String to be tested for validity
     * @returns true if valid, otherwise false.
     */
    isInt: function( strValue ) {
        var objRegExp  = /(^-?\d\d*$)/;
        return objRegExp.test(strValue);
    },

    isNum: function(v) {
        var objRegExp  =  /(^-?\d\d*\.\d*$)|(^-?\d\d*$)|(^-?\.\d\d*$)/;
        return objRegExp.test(v);
    },

    /**
     *  Validates that a string contains only valid integer number.
     * @param v String to be tested for validity
     * @returns true if valid, otherwise false.
     */
    isPosInt: function(v) {
        var objRegExp  = /(^[1-9]\d*$)/;
        return objRegExp.test(v);
    },
    isNNInt: function(v) {
        var objRegExp  = /(^[0-9]\d*$)/;
        return objRegExp.test(v);
    },

    min: function(v, p_min){
        return v.hasOwnProperty('length') && !validateNum(v)? v.length: v >= p_min ;
    },

    max: function(v, p_max){
        return v.hasOwnProperty('length') && !validateNum(v)? v.length: v <= p_max ;
    }
};

/**
 *
 * @param pValue
 * @param pArray
 * @param {boolean} [true] Whether to return a boolean, if false it will return an index on success, -1 otherwise
 * @return {boolean}  true if elment is found in the array false otherwise
 */
function inArray(value, aArray, bIsBool){
    bIsBool = bIsBool === false? false: true;

    try{
        var i = aArray.length, item;

        while(item = aArray[--i]){
            if(isEqual(item, value)) return bIsBool? true: i;
        }
    }catch(e){
        console.debug(e);
    }
    return false;
}

function isDefined(v){
    return v !== null && v !== undefined;
}

function isSet(v){
    return !!v || v===0;
}

/**
 * Take string input in varName and determine whether it is defined object in Javascript
 * @param {String} varName
 * @return {boolean}
 */

function isDefinedName(varName) {

    var retStatus = false;

    if (typeof varName == "string") {
        try {
            var arrCheck = varName.split(".");
            var strCheckName = "";

            for (var i= 0, arrLen = arrCheck.length ; i < arrLen; i++){
                strCheckName = strCheckName + arrCheck[i];

                //check wether this exist
                if (typeof eval(strCheckName) == "undefined") {
                    //stop processing
                    retStatus = false;
                    break;
                } else {
                    //continue checking next node
                    retStatus = true;
                    strCheckName = strCheckName + ".";
                }
            }
        } catch (e) {
            //any error means this var is not defined
            retStatus = false;
        }
    } else {
        throw "the varName input must be a string like myVar.someNode.anotherNode[]";
    }

    return retStatus;
}

function renameObjProperty(obj, oldName, newName){
    if (obj.hasOwnProperty(oldName)) {
        obj[newName] = obj[oldName];
        delete obj[oldName];
    }
    return obj;
}

Function.prototype.defaultTo = function() {
    var fn = this, defaults = arguments;
    return function() {
        var args = arguments,
            len = arguments.length,
            newArgs = [].slice.call(defaults, 0),
            overrideAll = args[len - 1] === undefined;
        for(var i = 0; i < len; i++) {
            if(overrideAll || args[i] !== undefined) {
                newArgs[i] = args[i];
            }
        }
        return fn.apply(this, newArgs);
    };
};

function DateInXDays(aDate, xDays){
    newDate = new Date(aDate);
    newDate.setDate(newDate.getDate()+xDays);
    return newDate;
}

/**
 * Returns annual week of the date
 * @return {number} Annual week number
 */
Date.prototype.getWeek = function() {
    var oneJanTime = Date.UTC(this.getUTCFullYear(),0,1);
    var firstWeekStartTime = oneJanTime - ((new Date(oneJanTime)).getUTCDay())*86400000;
    var thisTime = this.getTime();
    var days = (thisTime - firstWeekStartTime) / 86400000;
    var weeks = days/7;
    return Math.ceil(weeks);
};

Date.prototype.dayStart = function() {
    this.setHours(0,0,0,0);
    return this;
}
Date.prototype.dayEnd = function() {
    this.setHours(23,59,59,999);
    return this;
}

/*
 @vValue {Number}
 @sType {String}
 return {Date}
 */
Date.prototype.add = function(nValue, sType) {
    var self = this;
    var dt = new Date(self.getTime());

    switch(sType) {
        case 's':
        case 'ss':
        case 'second':
        case 'seconds':
            dt.setSeconds(dt.getSeconds() + nValue);
            return dt;
        case 'm':
        case 'mm':
        case 'minute':
        case 'minutes':
            dt.setMinutes(dt.getMinutes() + nValue);
            return dt;
        case 'h':
        case 'hh':
        case 'hour':
        case 'hours':
            dt.setHours(dt.getHours() + nValue);
            return dt;
        case 'd':
        case 'dd':
        case 'day':
        case 'days':
            dt.setDate(dt.getDate() + nValue);
            return dt;
        case 'M':
        case 'MM':
        case 'month':
        case 'months':
            dt.setMonth(dt.getMonth() + nValue);
            return dt;
        case 'y':
        case 'yyyy':
        case 'year':
        case 'years':
            dt.setFullYear(dt.getFullYear() + nValue);
            return dt;
    }
    return dt;
};

/**
 * Compare dates
 * @param {Date} date
 * @return {Number} Results: -1 = this date is earlier than @date, 0 = current date is same as @date, 1 = this date is later than @date
 */
Date.prototype.compare = function(date) {

    var self = this;
    var r = self.getTime() - date.getTime();

    if (r === 0)
        return 0;

    if (r < 0)
        return -1;

    return 1;
};

/**
 * Compare two dates
 * @param {String or Date} d1
 * @param {String or Date} d2
 * @return {Number} Results: -1 = @d1 is earlier than @d2, 0 = @d1 is same as @d2, 1 = @d1 is later than @d2
 */
Date.compare = function(d1, d2) {

    if (typeof(d1) === "string")
        d1 = d1.parseDate();

    if (typeof(d2) === "string")
        d2 = d2.parseDate();

    return d1.compare(d2);
};

/*
 Format date to string
 @format {String}
 return {String}
 */
Date.prototype.format = function(format) {
    var self = this;

    var h = self.getHours();
    var m = self.getMinutes().toString();
    var s = self.getSeconds().toString();
    var M = (self.getMonth() + 1).toString();
    var yyyy = self.getFullYear().toString();
    var d = self.getDate().toString();

    var a = 'AM';
    var H = h.toString();


    if (h >= 12) {
        h -= 12;
        a = 'PM';
    }

    if (h === 0)
        h = 12;

    h = h.toString();

    var hh = h.padLeft(2, '0');
    var HH = H.padLeft(2, '0');
    var mm = m.padLeft(2, '0');
    var ss = s.padLeft(2, '0');
    var MM = M.padLeft(2, '0');
    var dd = d.padLeft(2, '0');
    var yy = yyyy.substring(2);

    return format.replace(/yyyy/g, yyyy).replace(/yy/g, yy).replace(/MM/g, MM).replace(/M/g, M).replace(/dd/g, dd).replace(/d/g, d).replace(/HH/g, HH).replace(/H/g, H).replace(/hh/g, hh).replace(/h/g, h).replace(/mm/g, mm).replace(/m/g, m).replace(/ss/g, ss).replace(/s/g, ss).replace(/a/g, a);
};


DateDiff= {
    inDays: function(d1, d2) {
        var mD1 = new Date(d1);
        var mD2 = new Date(d2);
        mD1.setHours(0,0,0,0);
        mD2.setHours(0,0,0,0);

        return  Math.ceil((mD2 - mD1) / 86400000) + 1;
    },

    inWeeks: function(d1, d2) {
        var t2 = d2.getTime();
        var t1 = d1.getTime();

        return parseInt((t2-t1)/(24*3600*1000*7), 10);
    },

    inMonths: function(d1, d2) {
        var d1Y = d1.getFullYear();
        var d2Y = d2.getFullYear();
        var d1M = d1.getMonth();
        var d2M = d2.getMonth();

        return (d2M+12*d2Y)-(d1M+12*d1Y);
    },

    inYears: function(d1, d2) {
        return d2.getFullYear()-d1.getFullYear();
    }
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

//***************** Polyfills *******************//

if (!Object.keys) {
    Object.keys = (function () {
        var hasOwnProperty = Object.prototype.hasOwnProperty,
            hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
            dontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
            ],
            dontEnumsLength = dontEnums.length;

        return function (obj) {
            if (typeof obj !== 'object' && typeof obj !== 'function' || obj === null) throw new TypeError('Object.keys called on non-object')

            var result = [];

            for (var prop in obj) {
                if (hasOwnProperty.call(obj, prop)) result.push(prop)
            }

            if (hasDontEnumBug) {
                for (var i=0; i < dontEnumsLength; i++) {
                    if (hasOwnProperty.call(obj, dontEnums[i])) result.push(dontEnums[i])
                }
            }
            return result
        }
    })()
}

if (!Array.prototype.reduce)
{
    Array.prototype.reduce = function(fun /*, initial*/)
    {
        var len = this.length;
        if (typeof fun != "function")
            throw new TypeError();

        // no value to return if no initial value and an empty array
        if (len == 0 && arguments.length == 1)
            throw new TypeError();

        var i = 0;
        if (arguments.length >= 2)
        {
            var rv = arguments[1];
        }
        else
        {
            do
            {
                if (i in this)
                {
                    rv = this[i++];
                    break;
                }

                // if array contains no values, no initial value to return
                if (++i >= len)
                    throw new TypeError();
            }
            while (true);
        }

        for (; i < len; i++)
        {
            if (i in this)
                rv = fun.call(null, rv, this[i], i, this);
        }

        return rv;
    };
}

function addProperty(obj, sName, oConfig){
    var mObj = obj;
    oConfig = oConfig || {};
    var bMultiple = oConfig.multiple || false;
    var sSingleName = oConfig.multiple? (oConfig.singleName || sName.replace(/s$/,'')): sName;

    //if(mObj._properties)
    mObj['get'+capsFirst(sSingleName)] = function(key){
        if(!this['_'+sName]) return undefined;

        return this['_'+sName][key];
    };

    if(bMultiple) {
        mObj['remove'+capsFirst(sSingleName)] = function(key){
            if(!this['_'+sName]) return undefined;
            var toRet = this['_'+sName][key]
            delete this['_'+sName][key]
            return toRet;
        };
        mObj['add' + capsFirst(sSingleName)] = function (key, value) {
            this['_'+sName] = this['_'+sName] || []; // init
            var justValue = arguments.length<2;

            if(justValue){
                this['_'+sName].push(arguments[0]);
            }else{
                this['_'+sName][key] = value;
            }
        };
    }
}

//************************** Type definitions ******************************//
// definition of validation error
function ValidationError(message){
    this.message = message;
}