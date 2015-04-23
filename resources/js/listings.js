angular.module('ControllerListings', [
// Dependencies
    'ngTable'
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
    ngTableParams
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

    $scope.tableParams = new ngTableParams(initTableOptions, {
        counts: [],
        total: $scope.listings.length, // length of data
        getData: function($defer, params) {
            var orderedData = params.sorting() ?
                $filter('orderBy')($scope.listings, params.orderBy()) :
                $scope.listings;

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
            this.data = listing;
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