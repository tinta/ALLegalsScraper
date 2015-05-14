angular.module('Controller:OAuth', [
// Dependencies
    'OAuthFB',
    'OAuthGoogle',
])
.controller('Controller:OAuth', function(
// Dependency Injections
    $scope,
    $window,
    OAuthFB,
    OAuthGoogle
){
    window.googleAppID = {};
    window.googleAppID.clientId = "555054377171-n8geoctm8268uummgi35cb86uon8nusk.apps.googleusercontent.com";
    window.googleAppID.apiKey = "AIzaSyBaNq1KkYSljTYu_xTLCOYN9O84_6FLq48";
    window.googleAppID.scopes = "email";

    // OAuth
    $scope.oauth = {};
    // $scope.oauth.fb = new OAuthFB(window.promptlyConfig.fbAppID);
    $scope.oauth.google = new OAuthGoogle(window.googleAppID);

    $scope.user = {};
    $scope.user.set = function (user) {
        this.model = _.extend(this.model, user);
        this.model.isLoggedIn = true;
        this.model.firstName = this.model.displayName.split(' ')[0];

    };
    $scope.user.reset = function () {
        this.model = {};
        this.model.isLoggedIn = false;
        this.model.accountType = 'Inactive';
    };

    $scope.user.reset();

    $scope.$on("oauth:google:authorized", function(response, user) {
        $scope.user.set(user);
        if (!$scope.$$phase) $scope.$apply();
    });

    $scope.$on("oauth:google:deauthorized", function(response, user) {
        $scope.user.reset();
        if (!$scope.$$phase) $scope.$apply();
    });

    // Dev
    $window.logScope2 = function () {
        $window.$scope = $scope;
        console.log($scope);
    };
});