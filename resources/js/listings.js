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
    $scope.listings = $window.listings;

    function highlight (className) {
        return [
            '<span class="pad-lr text-white text-thin', className ,'">',
             '$&',
             '</span>'
        ].join(' ');
    }

    _.each($scope.listings, function(listing) {
        listing.pub_date = moment(listing.pub_date).format('YYYY/MM/DD');
        listing.sale_date = moment(listing.sale_date).format('YYYY/MM/DD');
        listing.timestamp = moment(listing.timestamp).format('YYYY/MM/DD');
    });

    var initTableOptions = {};
    initTableOptions.page = 1;      // Show first page
    initTableOptions.count = 10;    // Amount of rows per page
    initTableOptions.sorting = {    // Initial sorting settings
        'pub_date': 'desc'
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

    $scope.modal = {
        data: null,
        isOpen: false,
        saveSucceeded: null,
        open: function (listing) {
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

                // Angular's `$http` service isnt allowing us to post data to the express server for some reason...
                $.ajax({
                    method: 'POST',
                    url: '/update',
                    data: postBody,
                    success: function (data) {
                        This.open(data);
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