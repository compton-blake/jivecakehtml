export default class ItemService {
  constructor($window, $q, $http, itemTransactionService, settings, toolsService, relationalService, Organization, Event, Item) {
    this.$window = $window;
    this.$q = $q;
    this.$http = $http;
    this.itemTransactionService = itemTransactionService;
    this.settings = settings;
    this.toolsService = toolsService;
    this.relationalService = relationalService;
    this.Organization = Organization;
    this.Event = Event;
    this.Item = Item;

    this.settings = this.settings;
  }

  create(token, item) {
    let url = [this.settings.jivecakeapi.uri, 'event', item.eventId, 'item'].join('/');

    return this.$http.post(url, item, {
      headers: {
        Authorization: 'Bearer ' + token
      }
    }).then(response => this.toObject(response.data));
  }

  update(token, item) {
    const url = [this.settings.jivecakeapi.uri, 'item', item.id].join('/');

    return this.$http.post(url, item, {
      headers: {
        Authorization: 'Bearer ' + token
      }
    }).then((response) => {
      return this.toObject(response.data);
    });
  }

  read(token, id) {
    const url = [this.settings.jivecakeapi.uri, 'item', id].join('/');

    return this.$http.get(url, {
      headers: {
        Authorization: 'Bearer ' + token
      }
    }).then((response) => {
      return this.toObject(response.data);
    });
  }

  publicSearch(params) {
    const url = [this.settings.jivecakeapi.uri, 'item', 'search'].join('/');

    return this.$http.get(url, {
      params: params,
    }).then((response) => {
      return {
        entity: response.data.entity.map(this.toObject, this),
        count: response.data.count
      };
    });
  }

  search(token, params) {
    const url = [this.settings.jivecakeapi.uri, 'item'].join('/');

    return this.$http.get(url, {
      params: params,
      headers: {
        Authorization: 'Bearer ' + token
      }
    }).then((response) => {
      return {
        entity: response.data.entity.map(this.toObject, this),
        count: response.data.count
      };
    });
  }

  getDerivedAmounts(items, itemTransactionService) {
    let future;

    if (items.length === 0) {
      future = this.$q.resolve([]);
    } else {
      const time = new this.$window.Date().getTime();

      future = itemTransactionService.publicSearch({
        itemId: items.map(item => item.id),
        status: itemTransactionService.getPaymentCompleteStatus(),
        leaf: true
      }).then(searchResult => {
        const completeLeafTransactions = searchResult.entity.filter(transaction => transaction.status === itemTransactionService.getPaymentCompleteStatus() || transaction.status === itemTransactionService.getPaymentPendingStatus());
        const transactionMap = this.relationalService.groupBy(completeLeafTransactions, false, transaction => transaction.itemId);

        return items.map(function(item) {
          let result;

          if (item.timeAmounts !== null) {
            result = item.getDerivedAmountFromTime(time);
          } else if (item.countAmounts !== null) {
            const count = transactionMap[item.id].reduce((total, transaction) => total + transaction.quantity, 0);
            result = item.getDerivedAmountFromCounts(count);
          } else {
            result = item.amount;
          }

          return result;
        });
      });
    }

    return future;
  }

  getDerivedAmount(item, itemTransactionService) {
    let future;

    if (item.timeAmounts !== null) {
      future = this.$q.resolve(item.getDerivedAmountFromTime(new this.$window.Date().getTime()));
    } else if (item.countAmounts !== null) {
      future = itemTransactionService.publicSearch({
        itemId: item.id,
        status: itemTransactionService.getPaymentCompleteStatus(),
        leaf: true
      }).then(function(searchResult) {
        const completeLeafTransactions = searchResult.entity.filter(transaction => transaction.status === itemTransactionService.getPaymentCompleteStatus());
        return item.getDerivedAmountFromCounts(completeLeafTransactions.length);
      });
    } else {
      future = this.$q.resolve(item.amount);
    }

    return future;
  }

  getAggregatedItemData(token, params) {
    const url = [this.settings.jivecakeapi.uri, 'item', 'aggregated'].join('/');
    const options = {
      params: params
    };

    if (token !== null) {
      options.headers = {
        Authorization: 'Bearer ' + token
      };
    }

    return this.$http.get(url, options).then((response) => {
      response.data.forEach((group) => {
        group.entity = this.toolsService.toObject(group.parent, this.Event);

        group.itemData.forEach((itemDatum) => {
          itemDatum.item = this.toolsService.toObject(itemDatum.item, this.Item);
        });
      });

      return response.data;
    });
  }

  delete(token, id) {
    const url = [this.settings.jivecakeapi.uri, 'item', id].join('/');
    return this.$http.delete(url, {
      headers: {
        Authorization: 'Bearer ' + token
      }
    }).then(response => this.toObject(response.data));
  }

  getActiveStatus() {
    return 0;
  }

  toObject(subject) {
    return this.toolsService.toObject(subject, this.Item);
  }
}

ItemService.$inject = ['$window', '$q', '$http', 'ItemTransactionService', 'settings', 'ToolsService', 'RelationalService', 'Organization', 'Event', 'Item'];