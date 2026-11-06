/*
 * *****************************************************************************
 * Copyright (C) 2019-2022 Chrystian Huot <chrystian.huot@saubeo.solutions>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 * ****************************************************************************
 */

import { Component, OnDestroy } from '@angular/core';
import {
    RdioScannerAvoidOptions,
    RdioScannerBeepStyle,
    RdioScannerCategory,
    RdioScannerCategoryStatus,
    RdioScannerEvent,
    RdioScannerLivefeedMap,
    RdioScannerSystem,
    RdioScannerTalkgroup,
} from '../rdio-scanner';
import { RdioScannerService } from '../rdio-scanner.service';

export type SelectSortKey = 'active' | 'system' | 'label' | 'name' | 'group' | 'tag';

export interface SelectRow {
    system: RdioScannerSystem;
    talkgroup: RdioScannerTalkgroup;
}

@Component({
    selector: 'rdio-scanner-select',
    styleUrls: [
        '../common.scss',
        './select.component.scss',
    ],
    templateUrl: './select.component.html',
})
export class RdioScannerSelectComponent implements OnDestroy {
    categories: RdioScannerCategory[] | undefined;

    map: RdioScannerLivefeedMap = {};

    systems: RdioScannerSystem[] | undefined;

    tagsToggle: boolean | undefined;

    search = '';

    sortKey: SelectSortKey = 'system';

    sortAsc = true;

    private eventSubscription = this.rdioScannerService.event.subscribe((event: RdioScannerEvent) => this.eventHandler(event));

    constructor(private rdioScannerService: RdioScannerService) { }

    avoid(options?: RdioScannerAvoidOptions): void {
        if (options?.all == true) {
            this.rdioScannerService.beep(RdioScannerBeepStyle.Activate);

        } else if (options?.all == false) {
            this.rdioScannerService.beep(RdioScannerBeepStyle.Deactivate);

        } else if (options?.system !== undefined && options?.talkgroup !== undefined) {
            this.rdioScannerService.beep(this.map[options!.system.id][options!.talkgroup.id].active
                ? RdioScannerBeepStyle.Deactivate
                : RdioScannerBeepStyle.Activate
            );

        } else {
            this.rdioScannerService.beep(options?.status ? RdioScannerBeepStyle.Activate : RdioScannerBeepStyle.Deactivate);
        }

        this.rdioScannerService.avoid(options);
    }

    get rows(): SelectRow[] {
        const terms = this.search.toLowerCase().split(/\s+/).filter((t) => t);

        const rows: SelectRow[] = [];

        (this.systems || []).forEach((system) => system.talkgroups.forEach((talkgroup) => {
            const text = [system.label, talkgroup.id, talkgroup.label, talkgroup.name, talkgroup.group, talkgroup.tag]
                .join(' ').toLowerCase();

            if (terms.every((term) => text.includes(term))) rows.push({ system, talkgroup });
        }));

        const dir = this.sortAsc ? 1 : -1;

        return rows.sort((a, b) => {
            const cmp = this.sortValue(a, this.sortKey).localeCompare(this.sortValue(b, this.sortKey), undefined, { numeric: true, sensitivity: 'base' });

            return cmp !== 0 ? cmp * dir : (a.system.id - b.system.id) || (a.talkgroup.id - b.talkgroup.id);
        });
    }

    isActive(row: SelectRow): boolean {
        return !!this.map[row.system.id]?.[row.talkgroup.id]?.active;
    }

    isBlinking(row: SelectRow): boolean {
        return !!this.map[row.system.id]?.[row.talkgroup.id]?.minutes;
    }

    setAll(rows: SelectRow[], status: boolean): void {
        this.rdioScannerService.beep(status ? RdioScannerBeepStyle.Activate : RdioScannerBeepStyle.Deactivate);

        this.rdioScannerService.avoid({ items: rows, status });
    }

    setSort(key: SelectSortKey): void {
        if (this.sortKey === key) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortKey = key;
            this.sortAsc = true;
        }
    }

    sortIndicator(key: SelectSortKey): string {
        return this.sortKey !== key ? '' : this.sortAsc ? '▲' : '▼';
    }

    trackRow(_: number, row: SelectRow): string {
        return `${row.system.id}:${row.talkgroup.id}`;
    }

    ngOnDestroy(): void {
        this.eventSubscription.unsubscribe();
    }

    toggle(category: RdioScannerCategory): void {
        if (category.status == RdioScannerCategoryStatus.On)
            this.rdioScannerService.beep(RdioScannerBeepStyle.Deactivate);
        else
            this.rdioScannerService.beep(RdioScannerBeepStyle.Activate);

        this.rdioScannerService.toggleCategory(category);
    }

    private eventHandler(event: RdioScannerEvent): void {
        if (event.config) {
            this.tagsToggle = event.config.tagsToggle;
            this.systems = event.config.systems;
        }
        if (event.categories) this.categories = event.categories;
        if (event.map) this.map = event.map;
    }

    private sortValue(row: SelectRow, key: SelectSortKey): string {
        switch (key) {
            case 'active': return this.isActive(row) ? '0' : '1';
            case 'system': return row.system.label || '';
            case 'label': return row.talkgroup.label || '';
            case 'name': return row.talkgroup.name || '';
            case 'group': return row.talkgroup.group || '';
            case 'tag': return row.talkgroup.tag || '';
        }
    }
}
