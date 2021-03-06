'use strict';

function PriorityQueue(size) {
    this._size = Math.max(parseInt(size, 10) || 0, 1);
    this._slots = [];
    this._total = null;

    for (var i = 0; i < this._size; ++i) {
        this._slots.push([]);
    }
}

PriorityQueue.prototype = {
    get length(){
        if (this._total === null) {
            this._total = 0;
            for (var i = 0; i < this._size; ++i) {
                this._total += this._slots[i].length;
            }
        }
        return this._total;
    }
};

PriorityQueue.prototype.enqueue = function(obj, priority) {
    // Convert to integer with a default value of 0.
    priority = Math.min(this._size - 1, Math.max(0, parseInt(priority, 10) || 0));

    // Clear cache for total.
    this._total = null;

    this._slots[priority].push(obj);
};

PriorityQueue.prototype.dequeue = function() {
    this._total = null;
    for (var i = 0; i < this._size; ++i) {
        if (this._slots[i].length) {
            return this._slots[i].shift();
        }
    }
};

module.exports = PriorityQueue;
