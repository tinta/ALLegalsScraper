angular
.module('RowModel', [
// Dependencies
    'Model',
    'FieldModel',
    'Util'
])
.factory('RowModel', function(
// Dependency Injections
    Model,
    FieldModel,
    Util,
    $rootScope
){
    var RowModel = (function() {
        var editableFields = [
            'street_addr',
            'city',
            'sale_location',
            'sale_date',
            'zip',
            'price',
            'bed',
            'bath',
            'lot_area',
            'indoor_area',
            'build_year'
        ];

        var RowModel = function (properties) {
            var model = new Model(properties);
            _.extend(this, model);

            function set (property) {
                return Util.isPresent(this.model[property]) ? this.model[property] : ""
            }

            var initInfo = {};
            initInfo.isBeingEdited = false;

            _.each(editableFields, function(field) {
                initInfo[field] = set.bind(this)(field);
            }.bind(this))

            _.extend(this.model, initInfo)

            this._editForm();
            this.initiateEdit();
        };

        RowModel.prototype.initiateEdit = function () {
            // this.collection.abortEdits();

            this.model.isBeingEdited = true;

            var toSet = {};

            _.each(editableFields, function(field) {
                toSet[field] = this.model[field];
            }.bind(this));

            this.editForm.all.set(toSet);
            this.editForm.all.validate();

            $rootScope.$broadcast('RowModel:edit:commenced', this);

            return this;
        };

        RowModel.prototype.attemptEdit = function () {
            var saveInfo = {};
            saveInfo.isBeingEdited = false;

            _.each(editableFields, function(field) {
                saveInfo[field] = this.model[field];
            }.bind(this));

            _.extend(this.model, saveInfo);

            // this.collection.save();

            return this;
        };

        RowModel.prototype.abortEdit = function () {
            // this.collection.abortEdits();
            this.editForm.reset();

            return this;
        };

        RowModel.prototype._editForm = function () {
            var This = this;
            this.editForm = {};

            function validateInt (minVal, maxVal) {
                var value = this.value;
                this.errors = [];

                if (Util.isDefined(value)) {
                    this.errors.push(name + " must be defined.")
                    return false;
                }

                var isValid = true;
                value = String(value);
                var isInteger = parseInt(value) == value;
                var isGTMinVal = value >= minVal;
                var isLTMaxVal = value <= maxVal

                if (!isInteger) {
                    this.errors.push(this.title + " must be a valid integer.")
                    return false;
                }

                if (!isGTMinVal) {
                    this.errors.push(this.title + " must be greater than " + (minVal - 1) + ".")
                    isValid = false;
                }
                if (!isLTMaxVal) {
                    this.errors.push(this.title + " must be less than " + (maxVal + 1) + ".")
                    isValid = false;
                }

                return isValid
            }

            function validateStr (minLength, maxLength) {
                var value = this.value;
                this.errors = [];

                if (!Util.isDefined(value)) {
                    this.errors.push(this.title + " must be defined.")
                    return false;
                }

                var isValid = true;
                var isEmpty = value.length === 0;
                var isGTMinLength = value.length >= minLength;
                var isLTMaxLength = value.length <= maxLength;

                if (!isGTMinLength) {
                    isValid = false;
                    this.errors.push(this.title + " must be greater than " + minLength + " characters long.")
                }

                if (!isLTMaxLength) {
                    isValid = false;
                    this.errors.push(this.title + " must be less than " + maxLength + " characters long.")
                }

                return isValid;
            }

            this.editForm.sale_location = new FieldModel("Sale Location");
            this.editForm.sale_location.validate = function () {
                return validateStr.bind(this)(3, 100);
            };

            this.editForm.sale_date = new FieldModel("Sale Date");
            this.editForm.sale_date.validate = function () {
                return validateStr.bind(this)(3, 100);
            };

            this.editForm.city = new FieldModel("City");
            this.editForm.city.validate = function () {
                return validateStr.bind(this)(3, 100);
            };

            this.editForm.zip = new FieldModel("Zip");
            this.editForm.zip.validate = function () {
                return validateStr.bind(this)(3, 100);
            };

            this.editForm.street_addr = new FieldModel("Address");
            this.editForm.street_addr.validate = function () {
                return validateStr.bind(this)(3, 100);
            };

            this.editForm.bed = new FieldModel("Bed");
            this.editForm.bed.validate = function () {
                return validateStr.bind(this)(3, 100);
            };

            this.editForm.bath = new FieldModel("Bath");
            this.editForm.bath.validate = function () {
                return validateStr.bind(this)(3, 100);
            };

            this.editForm.price = new FieldModel("Price");
            this.editForm.price.validate = function () {
                return validateStr.bind(this)(3, 100);
            };

            this.editForm.lot_area = new FieldModel("Lot Area");
            this.editForm.lot_area.validate = function () {
                return validateStr.bind(this)(3, 100);
            };

            this.editForm.indoor_area = new FieldModel("Indoor Area");
            this.editForm.indoor_area.validate = function () {
                return validateStr.bind(this)(3, 100);
            };

            this.editForm.build_year = new FieldModel("Build Year");
            this.editForm.build_year.validate = function () {
                return validateStr.bind(this)(3, 100);
            };

            this.editForm.all = {
                validate: function () {
                    var data = {};
                    data.isUnchanged = this.isUnchanged();

                    this.errors = (function() {
                        var allErrors = [];
                        editableFields.forEach(function(field) {
                            This.editForm[field].errors;
                        });
                        return _.flatten(allErrors, true);
                    })();

                    data.isValid = this.errors.length === 0;

                    $rootScope.$broadcast('RowModel:edit:validated', data);

                    return data.isValid;
                },
                isUnchanged: function () {
                    this.change();

                    var unchangedList = [];
                    editableFields.forEach(function(field) {
                        unchangedList.push(This.editForm[field].isUnchanged);
                    });
                    unchangedList = _.unique(unchangedList);

                    return (unchangedList.length === 1 && unchangedList[0] === true);
                },
                change: function () {
                    editableFields.forEach(function(field) {
                        This.editForm[field].change();
                    });
                },
                set: function (properties) {
                    editableFields.forEach(function(field) {
                        var val = properties[field];
                        console.log(field)
                        This.editForm[field].set(val);
                    });

                    this.change();
                },
                errors: []

            };
            this.editForm.reset = function() {
                var toReset = {};

                editableFields.forEach(function(field) {
                    toReset[field] = undefined;
                });

                this.all.set(toReset);
            };
        };

        return RowModel;
    })();

    return RowModel;
});