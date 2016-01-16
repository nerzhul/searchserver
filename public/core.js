/*
	Copyright (c) 2015, Loic Blot <loic.blot@unix-experience.fr> 
	All rights reserved.
	Redistribution and use in source and binary forms, with or without
	modification, are permitted provided that the following conditions are met:

	* Redistributions of source code must retain the above copyright
	  notice, this list of conditions and the following disclaimer.
	* Redistributions in binary form must reproduce the above copyright
	  notice, this list of conditions and the following disclaimer in the
	  documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE REGENTS AND CONTRIBUTORS ``AS IS'' AND ANY
	EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
	WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
	DISCLAIMED. IN NO EVENT SHALL THE REGENTS AND CONTRIBUTORS BE LIABLE FOR ANY
	DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
	LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
	ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
	SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var app = angular.module('searchApp', []);

searchControllerScope = undefined;

app.controller('searchController', ['$scope','$http','$location',
	function($scope, $http, $location) {
		searchControllerScope = $scope;
		$scope.results = [];
		$scope.searchState = 0;
		$scope.location = $location.search();
		$scope.searchWhat = $scope.location.q;
		$scope.searchErrorCode = 0;

		$scope.search = function() {
			$scope.searchState = 1;

			var res = $http.post("/search", {"s": $scope.searchWhat});
			res.success(function(data, status, headers, config) {
				$scope.searchState = 2;
				$scope.results = data;
			});
			res.error(function(data, status, headers, config) {
				$scope.searchState = 3;
				$scope.searchErrorCode = status;
			});
		};

		$scope.markAsInteresting = function(r) {
			var res = $http.post("/interest", {"url": r.link, "content": r.body, "terms_searched": $scope.searchWhat});
				res.success(function(data, status, headers, config) {
			});
				res.error(function(data, status, headers, config) {
			});
		};

	    	$scope.$on('$locationChangeSuccess', function (event) {
			$scope.location = $location.search();
			$scope.searchWhat = $scope.location.q;
			if ($scope.searchWhat !== undefined) {
				eval($scope.search());
			}
		});
	}
]);
