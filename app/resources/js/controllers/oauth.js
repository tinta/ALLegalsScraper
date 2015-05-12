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

    $rootScope.$on("oauth:google:authorized", function(a, b) {
        console.log(a, b)
    });


    // Dev
    $window.logScope2 = function () {
        $window.$scope = $scope;
        console.log($scope);
    };
});