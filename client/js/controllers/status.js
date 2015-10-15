angular
  .module('app')
  .controller('StatusController', ['$scope', '$state', '$http', 'Bin', function($scope,
      $state, $http, Bin) {
    $scope.bins = [];
    $scope.statusItems = [
      { id: 'has-stock', name: 'Has stock' },
      { id: 'requires-stock', name: 'Requires stock' },
      { id: 'empty', name: 'Empty' }
    ];

    function getBins() {
      Bin
        .find()
        .$promise
        .then(function(results) {
          $scope.bins = results;
        });
    }
    getBins();

    $scope.binStatusCssClass = function(bin) {
      cssClass = "badge";

      switch (bin.status) {
        case "requires-stock": {
          cssClass += " badge-warning";
          break;
        }
        case "empty": {
          cssClass += " badge-important";
          break;
        }
        case "has-stock":
        default: {
          // do nothing
          break;
        }
      }

      return cssClass;
    }

    $scope.binStatusChanged = function(bin) {
      var res = $http.put('/api/bins/' + bin.id, bin);
      res.success(function(data, status, headers, config) {
        console.log("Bin upated!");
      });
      res.error(function(data, status, headers, config) {
        alert( "failure message: " + JSON.stringify({data: data}));
      });
      return bin.status;
    }

    var socket = io.connect();
    socket.on('bin/updated', function (data) {
      updateBin(data.body);
      $scope.$apply();
    });

    var updateBin = function(newBin) {
      var i;
      for (i = 0; i < $scope.bins.length; i++) {
        if ($scope.bins[i].id == newBin.id) {
          $scope.bins[i].status = newBin.status;
        }
      }
    }
  }]);
