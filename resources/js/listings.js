angular.module('ControllerListings', [
// Dependencies
    'ngTable',
    'RowModel',
    'ngSanitize'
], function($interpolateProvider) {
    $interpolateProvider.startSymbol('[[');
    $interpolateProvider.endSymbol(']]');
})
.controller('ControllerListings', function(
// Dependency Injections
    $scope,
    $http,
    $timeout,
    $window,
    $filter,
    $http,
    $sce,
    ngTableParams,
    RowModel
){
    $scope.listings = _.merge([],$window.listings);

    // Format dates
    _.each($scope.listings, function(listing, index) {
        $scope.listings[index] = createRow(listing, index);
    });

    function createRow (listing, index) {
        var row = _.merge({}, listing);
        row.pub_date = moment(listing.pub_date).utcOffset(0).format('YYYY/MM/DD');
        row.sale_date = moment(listing.sale_date).utcOffset(0).format('YYYY/MM/DD');
        row.timestamp = moment(listing.timestamp).utcOffset(0).format('YYYY/MM/DD');
        row.index = index;
        return row;
    }

    // `ng-table` stuff
    var initTableOptions = {};
    initTableOptions.page = 1;      // Show first page
    initTableOptions.count = 10;    // Amount of rows per page
    initTableOptions.sorting = {    // Initial sorting settings
        'sale_date': 'desc'
    };
    initTableOptions.filter = {};

    $scope.tableParams = new ngTableParams(initTableOptions, {
        counts: [],
        total: $scope.listings.length, // length of data
        getData: function($defer, params) {
            // Filter through the rows
            var filteredData = params.filter() ?
                $filter('filter')($scope.listings, params.filter()) :
                $scope.listings;

            // Let pagination know what the new number of rows are
            params.total(filteredData.length);

            // Then sort the rows
            var orderedData = params.sorting() ?
                $filter('orderBy')(filteredData, params.orderBy()) :
                filteredData;

            var data = orderedData.slice(
                (params.page() - 1) * params.count(),
                params.page() * params.count()
            );

            $defer.resolve(data);
        }
    });

    var hash = window.location.hash;
    if (hash.substring(0,2) == '#/') {
        $scope.tableParams.filter()['county'] = hash.substring(2, hash.length);
    }

    // Detail modal stuff
    $scope.modal = {
        data: null,
        isOpen: false,
        saveSucceeded: null,
        open: function (listingIndex) {
            var listing = $scope.listings[listingIndex];
            // Work-around for text-highlighting in `body`
            var edit = _.omit(listing, ['body']);
            this.data = new RowModel(edit);

            this.data.initiateEdit();
            this.isOpen = true;

            this.data.body = (function() {
                var body = listing.body;
                var highlightMap = {
                    'bg-red': [
                        'alabama',
                        '(?:\\s)al(?:\\s)',
                        '(?:\\w*\\s)county',
                    ],
                    'bg-orange': [
                        'January',
                        'February',
                        'March',
                        'April',
                        'May',
                        'June',
                        'July',
                        'August',
                        'September',
                        'October',
                        'November',
                        'December',
                        '20\\d\\d'
                    ],
                    'bg-blue': [
                        "attorney(\\'?)(s?)",
                        'courthouse'
                    ],
                    'bg-green': [
                        "3(\\d{4})(?:\\s)"
                    ],
                    'bg-purple': [
                        '(?:\\s)circle(?:\\s)',
                        '(?:\\s)cir(?:\\s)',
                        '(?:\\s)drive(?:\\s)',
                        '(?:\\s)dr(?:\\s)',
                        '(?:\\s)road(?:\\s)',
                        '(?:\\s)rd(?:\\s)',
                        '(?:\\s)avenue(?:\\s)',
                        '(?:\\s)ave(?:\\s)',
                        '(?:\\s)highway(?:\\s)',
                        '(?:\\s)street(?:\\s)',
                        '(?:\\s)st(?:\\s)',
                        '(?:\\s)trail(?:\\s)',
                    ]
                };

                function highlight (className) {
                    return [
                        '<span class="pad-lr text-white text-thin', className ,'">',
                         '$&',
                         '</span>'
                    ].join(' ');
                }

                _.each(highlightMap, function(highlightList, key) {
                    _.each(highlightList, function(text) {
                        var re = new RegExp(text, 'gi');
                        var match
                        body = body.replace(re, highlight(key));
                    });
                });

                return $sce.trustAsHtml(body);
            })();
        },
        close: function () {
            this.data = null;
            this.saveSucceeded = null;
            this.isOpen = false;
        },
        abortEdit: function () {
            this.data.abortEdit();
            this.saveSucceeded = null;
            this.data.initiateEdit();
        },
        save: function () {
            var This = this;
            var postBody;

            if (!this.data.editForm.all.isUnchanged()) {
                this.data.attemptEdit();

                postBody = this.data.model;

                postBody.pub_date = moment(this.data.model.pub_date, 'YYYY/MM/DD').format();
                postBody.sale_date = moment(this.data.model.sale_date, 'YYYY/MM/DD').format();

                // Angular's `$http` service isnt allowing us to post data to the express server for some reason...
                $.ajax({
                    method: 'POST',
                    url: '/update',
                    data: postBody,
                    success: function (data) {
                        var oldRow = _.findWhere($scope.listings, {case_id: data.case_id});
                        var newRow = _.merge(oldRow, createRow(data, oldRow.index));
                        $scope.listings[oldRow.index] = newRow;
                        This.open(newRow.index);
                        This.saveSucceeded = true;
                        $scope.$apply();
                    },
                    error: function (err) {
                        This.saveSucceeded = false;
                        console.log(err);
                    }
                });
            }
        }
    };

    // Dev
    $window.logScope = function () {
        $window.$scope = $scope;
        console.log($scope);
    };
});