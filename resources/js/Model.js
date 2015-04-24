angular
.module('Model', [
// Dependencies
])
.factory('Model', function(
// Dependency Injections
){
    var Model = (function() {
        var Model = function (properties) {
            this.model = _.extend({}, properties);
            if (this.init) this.init();
        };

        Model.prototype.init = function() {};

        Model.prototype.edit = function (properties) {
            _.extend(this.model, properties);
        };

        Model.prototype.get = function (key) {
            return this.model[key];
        }

        return Model;
    })();

    return Model;
});