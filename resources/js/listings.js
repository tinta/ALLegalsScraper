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
    $http,
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
        saveSucceeded: null,
        open: function (listing) {
            console.log(listing)
            this.data = new RowModel(listing);
            this.data.initiateEdit();
            this.isOpen = true;
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
            this.data.attemptEdit();

            var postBody = this.data.model;

            // Angular's $http directive isnt allowing us to post data to the express server for some reason...
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
    };


    // Dev
    $window.logScope = function () {
        $window.$scope = $scope;
        console.log($scope);
    };
});