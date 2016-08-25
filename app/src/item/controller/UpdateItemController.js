export default class UpdateItemController {
  constructor(
    angular,
    $window,
    $q,
    $rootScope,
    $scope,
    $state,
    $mdDialog,
    $mdToast,
    $stateParams,
    storageService,
    eventService,
    paymentProfileService,
    organizationService,
    itemService,
    uiService,
    toolsService
  ) {
    this.angular = angular;
    this.$window = $window;
    this.$q = $q;
    this.$rootScope = $rootScope;
    this.$scope = $scope;
    this.$state = $state;
    this.$mdDialog = $mdDialog;
    this.$mdToast = $mdToast;
    this.$stateParams = $stateParams;
    this.eventService = eventService;
    this.paymentProfileService = paymentProfileService;
    this.organizationService = organizationService;
    this.itemService = itemService;
    this.uiService = uiService;

    this.$scope.selected = [];
    this.$scope.time = {};
    this.$scope.paymentProfiles = [];
    this.parentOrganizationId = null;
    this.storage = storageService.read();
    this.$scope.timeSelections = this.uiService.getTimeSelections();
    this.$scope.currentDate = new this.$window.Date();
    this.$scope.hours = this.$window.Array.from(new this.$window.Array(24), (item, index) => index);
    this.$scope.minutes = this.$window.Array.from(new this.$window.Array(60), (item, index) => index);

    this.run();
  }

  run() {
    this.$scope.uiReady = false;

    return this.itemService.read(this.storage.token, this.$stateParams.itemId).then((item) => {
      if (item.timeStart === null) {
        this.$scope.timeStart = {
          time: null,
          hour: null,
          minute: null
        };
      } else {
        this.$scope.timeStart = {
          time: new this.$window.Date(item.timeStart)
        };

        this.$scope.timeStart.hour = this.$scope.timeStart.time.getHours();
        this.$scope.timeStart.minute = this.$scope.timeStart.time.getMinutes();
      }

      if (item.timeEnd === null) {
        this.$scope.timeEnd = {
          time: null,
          hour: null,
          minute: null
        };
      } else {
        this.$scope.timeEnd = {
          time: new this.$window.Date(item.timeEnd)
        };

        this.$scope.timeEnd.hour = this.$scope.timeEnd.time.getHours();
        this.$scope.timeEnd.minute = this.$scope.timeEnd.time.getMinutes();
      }

      this.$scope.item = item;

      this.$scope.enableScheduledPriceModifications = item.timeAmounts !== null;
      this.$scope.itemName = item.name;
      this.$scope.free = item.amount === 0 || item.amount === null;

      return this.eventService.read(this.storage.token, item.eventId).then((event) => {
        this.$scope.event = event;

        return this.paymentProfileService.search(this.storage.token, {
          organizationId: event.organizationId
        }).then((searchResult) => {
          this.$scope.paymentProfiles = searchResult.entity;
        });
      });
    }).finally(() => {
      this.$scope.uiReady = true;
    });
  }

  addTimeAmount(price, time) {
    const validTime = time.date instanceof this.$window.Date && typeof time.hour === 'number' && typeof time.minute === 'number';
    const validPrice = typeof price === 'number';

    if (validTime && validPrice) {
      if (this.$scope.item.timeAmounts === null) {
        this.$scope.item.timeAmounts = [];
      }

      const date = new this.$window.Date(time.date);
      date.setHours(time.hour);
      date.setMinutes(time.minute);

      this.$scope.item.timeAmounts.push({
        amount: price.toFixed(2),
        after: date.getTime()
      });

      this.$scope.amount = '';
      time.date = null;
      time.hour = null;
      time.minute = null;
    } else {
      if (!validTime) {
        this.uiService.notify('Please enter a valid time');
      } else if (!validPrice) {
        this.uiService.notify('Please enter a valid price');
      }
    }
  }

  submit(item, free, enableScheduledPriceModifications, timeStart, timeEnd) {
    const itemCopy = this.angular.copy(item);

    if (timeStart.time === null) {
      itemCopy.timeStart = null;
    } else {
      const date = new this.$window.Date(timeStart.time);

      if (timeStart.hour === null) {
        date.setHours(0);
      } else {
        date.setHours(timeStart.hour);
      }

      if (timeStart.minute === null) {
        date.setMinutes(0);
      } else {
        date.setMinutes(timeStart.minute);
      }

      itemCopy.timeStart = date.getTime();
    }

    if (timeEnd.time === null) {
      itemCopy.timeEnd = null;
    } else {
      const date = new this.$window.Date(timeEnd.time);

      if (timeEnd.hour === null) {
        date.setHours(0);
      } else {
        date.setHours(timeEnd.hour);
      }

      if (timeEnd.minute === null) {
        date.setMinutes(0);
      } else {
        date.setMinutes(timeEnd.minute);
      }

      itemCopy.timeEnd = date.getTime();
    }

    if (itemCopy.timeStart !== null && itemCopy.timeEnd !== null && itemCopy.timeStart > itemCopy.timeEnd) {
      this.uiService.notify('Start Time must be before End Time');
    } else {
      this.$scope.uiReady = false;

      if (free) {
        itemCopy.amount = null;
        itemCopy.timeAmounts = null;
        itemCopy.countAmounts = null;
      }

      if (!enableScheduledPriceModifications) {
        itemCopy.timeAmounts = null;
      }

      if (this.$window.Array.isArray(itemCopy.timeAmounts) && itemCopy.timeAmounts.length === 0) {
        itemCopy.timeAmounts = null;
      }

      this.itemService.update(this.storage.token, itemCopy).then((item) => {
        this.$scope.item = item;

        this.uiService.notify('Updated ' + item.name);
        this.$rootScope.$broadcast('ITEM.UPDATED', this.$scope.item);

        const parameters = 'organizationId' in item ? {organizationId: item.organizationId} : {eventId: item.eventId};

        this.$state.go('application.internal.item.read', parameters);
      }, () => {
        this.uiService.notify('Unable to update item');
      }).finally(() => {
        this.$scope.uiReady = true;
      });
    }
  }

  showInformation() {
    this.$mdDialog.show({
      templateUrl: '/src/event/partial/updateEventInformation.html',
      clickOutsideToClose: true
    });
  }
}

UpdateItemController.$inject = [
  'angular',
  '$window',
  '$q',
  '$rootScope',
  '$scope',
  '$state',
  '$mdDialog',
  '$mdToast',
  '$stateParams',
  'StorageService',
  'EventService',
  'PaymentProfileService',
  'OrganizationService',
  'ItemService',
  'UIService',
  'ToolsService'
];