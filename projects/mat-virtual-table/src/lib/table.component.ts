import {
  Component,
  Input,
  OnInit,
  ViewChild,
  ElementRef,
  ContentChildren,
  QueryList,
  AfterViewInit,
  ViewEncapsulation,
  ViewChildren,
  ChangeDetectionStrategy,
  HostListener
} from '@angular/core';

import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { distinctUntilChanged, debounceTime } from 'rxjs/operators';

import { fromEvent, BehaviorSubject } from 'rxjs';
import { GridTableDataSource } from './data-source';
import { MatSort, MatPaginator } from '@angular/material';
import { ColumnDef as _columnsDef } from './table.interfaces';
import { orderBy, keyBy, max, sumBy } from 'lodash';
import { PCellDef } from './PCellDef';
import { FixedSizeVirtualScrollStrategy, VIRTUAL_SCROLL_STRATEGY } from '@angular/cdk/scrolling';
interface ColumnDef extends _columnsDef {
  template?;
}

export class CustomVirtualScrollStrategy extends FixedSizeVirtualScrollStrategy {
  constructor() {
    super(47, 1000, 2000);
  }
  attach(viewport: CdkVirtualScrollViewport): void {
    this.onDataLengthChanged();
  }
}


@Component({
  // tslint:disable-next-line: component-selector
  selector: 'mat-virtual-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  providers: [{ provide: VIRTUAL_SCROLL_STRATEGY, useClass: CustomVirtualScrollStrategy }],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableComponent implements OnInit, AfterViewInit {
  @Input() set columnsDef(columns: ColumnDef[]) {
    this._columnsDef = columns;
    this.columns = this.columnsDef.map(c => c.field);
  }
  get columnsDef() { return this._columnsDef; }
  @Input() set rows(rows: any[]) {
    if (!rows) { return; }
    this._rows = rows || [];
    if (!this.columnsDef) {
      this.columnsDef = Object.keys(this._rows[0]).map(key => ({ field: key, title: key } as ColumnDef));
    }

    this.initColumnsWidth();

    this.initDatasource();
  }
  @HostListener('window:resize', ['$event'])
  initColumnsWidth(event?) {
    const widths = {};
    this.columnsDef.forEach((c, i) => {
      widths[c.field] =
        (max(this.rows.slice(0, this.pageSize)
          .map(r => !r[c.field] ? 20 : r[c.field].toString().length)) * 8.1 + (i === 0 ? 30 : 6));
    });

    const extra = this.viewport.elementRef.nativeElement.clientWidth - sumBy(Object.values(widths)) - 20;
    if (extra > 0) {
      const toAdd = extra / this.columnsDef.length;
      this.columnsDef.forEach(c => widths[c.field] += toAdd);
    }
    this.columnsDef.forEach(c => c.width = c.width && !event ? c.width : (widths[c.field] + 'px'));
  }
  get rows() { return this._rows || []; }
  pending: boolean;
  sticky = true;
  dir: 'ltr' | 'rtl' = 'ltr';
  @ViewChild(CdkVirtualScrollViewport) viewport: CdkVirtualScrollViewport;
  _matSort: MatSort;
  @ViewChild(MatSort) set matSort(matSort: MatSort) {
    if (!matSort || this._matSort) { return; }
    this._matSort = matSort;
    matSort.sortChange.subscribe(() => {
      this.pending = true;
      setTimeout(() => {
        this.dataSource.allData = orderBy(this.rows, matSort.active, matSort.direction as any);
        this.pending = false;
      }, 200);
    });
  }
  @ViewChild('filter') filter: ElementRef;
  _headerCells: ElementRef[];
  @ViewChildren('headercell') set headerCells(cells) {
    this._headerCells = cells.toArray();
  }

  @ContentChildren(PCellDef) _CellDefs: QueryList<PCellDef>;
  filterChange = new BehaviorSubject('');
  dataSource: GridTableDataSource;
  offset: number;
  private _columnsDef: ColumnDef[];
  inMove = false;
  private _rows: any[];
  @Input() isFilterable = true;
  @Input() isResizable = true;
  @Input() filterPlaceholder = 'Filter';
  @Input() itemSize = 47;
  @Input() headerSize = 56;
  @Input() pageSize = 50;
  @Input() paginator: boolean;
  columns: string[];

  isResizeActive = false;
  ngOnInit() {

  }

  initDatasource() {
    if (!this.dataSource) {
      this.dataSource = new GridTableDataSource(this.rows, this.viewport, this.itemSize, this.pageSize);
    }
    this.dataSource.allData = this.rows;
    if (this.isFilterable || this.columnsDef.some(c => c.isFilterable)) {
      const filterables = this.columnsDef.filter(c => c.isFilterable);
      const defByKey = keyBy(this.columnsDef, c => c.field);
      for (const row of this.rows) {
        row.query = ' ';
        for (const key of Object.keys(row)) {
          if (!filterables.length || defByKey[key].isFilterable) {
            row.query += row[key] + ' ';
          }
        }
        row.query = row.query.toLowerCase();
      }
    }
  }
  changePage(page) {
    this.viewport.scrollToOffset(page.pageIndex * page.pageSize * this.itemSize + this.headerSize);
  }

  ngAfterViewInit(): void {
    if (this.isFilterable || this.columnsDef.some(c => c.isFilterable)) {
      fromEvent(this.filter.nativeElement, 'keyup')
        .pipe(distinctUntilChanged(), debounceTime(150))
        .subscribe(() => {
          this.pending = true;
          setTimeout(() => {
            const str = this.filter.nativeElement.value.toLowerCase();
            this.dataSource.allData =
              this.rows.filter(row => (row.query as string).indexOf(' ' + str) !== -1);
            if (this.dataSource.allData.length < 50) {
              this.dataSource.allData =
                this.rows.filter(row => (row.query as string).indexOf(str) !== -1);
            }

            this.pending = false;
          }, 200);
        });
    }

    setTimeout(() => {
      this._CellDefs.forEach(columnDef => {
        this.columnsDef.find(c => c.field === columnDef.columnName).template = columnDef.template;
      });
    }, 0);

    this.dir = window.getComputedStyle(this.filter.nativeElement).direction as any;

  }
  private getTargetX(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left;
  }
  resizeTable(event, i) {
    const cells = this._headerCells;
    const elNextIndex = i + 1;
    if (this.inMove || !this.isResizeActive || !cells[elNextIndex]) { return; }
    this.inMove = true;
    const el = cells[i].nativeElement;
    const elStartWidth = el.clientWidth;
    const startX = event.pageX;
    const dir = this.dir === 'ltr' ? 1 : -1;
    const elNextStartWidth = cells[elNextIndex].nativeElement.clientWidth;
    const moveFn = (ev: any) => {
      const offset = (ev.pageX - startX) * dir;
      this.columnsDef[i].width = elStartWidth + offset + 'px';
      this.columnsDef[elNextIndex].width = elNextStartWidth - offset + 'px';
    };
    const upFn = () => {
      document.removeEventListener('mousemove', moveFn);
      document.removeEventListener('mouseup', upFn);
      this.inMove = false;
    };
    document.addEventListener('mousemove', moveFn);
    document.addEventListener('mouseup', upFn);
  }

  mousemove(ev, i) {
    if (!this.isResizable || this.inMove) { return; }
    this.isResizeActive = false;
    ev.target.style.cursor = 'pointer';
    const el = ev.currentTarget;
    const elWidth = el.clientWidth;
    let x = this.getTargetX(ev);
    if (this.dir === 'rtl') {
      x = elWidth - x;
    }
    if (elWidth - x < 10) {
      ev.target.style.cursor = 'col-resize';
      this.isResizeActive = true;
    }
  }
}
