import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { TableModule } from '../../projects/mat-virtual-table/src/lib/table.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { TableComponent } from '../../projects/mat-virtual-table/src/lib/table.component';
import { DynaFormModule } from '../../projects/dyna-form/src/lib/dyna.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';

export class CustomMatPaginatorIntl extends MatPaginatorIntl {
    nextPageLabel = 'הבא';
    previousPageLabel = 'קודם';
    getRangeLabel = (page, pageSize, length) => {
        if (length === 0 || pageSize === 0) {
            return '0 מתוך ' + length;
        }
        length = Math.max(length, 0);
        const startIndex = page * pageSize;
        // If the start index exceeds the list length, do not try and fix the end index to the end.
        const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;
        return startIndex + 1 + ' - ' + endIndex + ' מתוך ' + length;
    }
}

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        TableModule,
        BrowserAnimationsModule,
        MatDialogModule,
        MatButtonModule,
        DynaFormModule,
        FlexLayoutModule,
    ],
    providers: [{ provide: MatPaginatorIntl, useClass: CustomMatPaginatorIntl }],
    bootstrap: [AppComponent],
    entryComponents: [TableComponent],
})
export class AppModule {}
