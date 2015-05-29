/* global angular, user */
angular.module('Controller:User', [])
  .controller('Controller:User', function (
    // Dependency Injections
    $scope
  ) {
    $scope.user = user
  })
