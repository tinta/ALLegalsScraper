angular.module('ControllerListings', [
// Dependencies
    'ngTable',
    'RowModel'
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
    ngTableParams,
    RowModel
){
    $scope.listings = $window.listings;

    _.each($scope.listings, function(listing) {
        listing.pub_date = moment(listing.pub_date).format('MM/DD/YYYY');
        listing.timestamp = moment(listing.timestamp).format('MM/DD/YYYY');
    });

    var initTableOptions = {};
    initTableOptions.page = 1;      // Show first page
    initTableOptions.count = 20;    // Amount of rows per page
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
        open: function (listing) {
            console.log(listing)
            this.data = new RowModel(listing);
            this.isOpen = true;
        },
        close: function () {
            this.data = null;
            this.isOpen = false;
        }
    };


    // Dev
    $window.logScope = function () {
        $window.$scope = $scope;
        console.log($scope);
    };
});