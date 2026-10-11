import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Award } from "lucide-react";
import { getAvatarColor, getInitials } from "@/lib/leadDisplay";

export interface SellerRankingRow {
  sellerId: string;
  sellerName: string;
  totalOrders: number;
  totalSales: number;
  averageCheck: number;
  conversionRate: number;
}

const RANK_STYLES = [
  "bg-yellow-500 text-yellow-950",
  "bg-gray-400 text-gray-950",
  "bg-amber-600 text-amber-950",
];

interface SellerRankingTableProps {
  rows: SellerRankingRow[];
  onRowClick?: (sellerId: string) => void;
}

const SellerRankingTable = ({ rows, onRowClick }: SellerRankingTableProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0">
      <div>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-muted-foreground" />
          Sotuvchilar reytingi
        </CardTitle>
        <p className="text-sm text-muted-foreground">Savdo natijalari bo'yicha eng yaxshi sotuvchilar</p>
      </div>
    </CardHeader>
    <CardContent className="p-0">
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Ma'lumotlar mavjud emas</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Sotuvchi</TableHead>
                <TableHead>Jami zakazlar</TableHead>
                <TableHead>Jami savdo</TableHead>
                <TableHead>O'rtacha chek</TableHead>
                <TableHead>Konversiya</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.sellerId} className={onRowClick ? "cursor-pointer" : ""} onClick={() => onRowClick?.(row.sellerId)}>
                  <TableCell>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        RANK_STYLES[index] ?? "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={`text-xs font-semibold ${getAvatarColor(row.sellerName)}`}>
                          {getInitials(row.sellerName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{row.sellerName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{row.totalOrders}</TableCell>
                  <TableCell>{row.totalSales.toLocaleString()} so'm</TableCell>
                  <TableCell>{Math.round(row.averageCheck).toLocaleString()} so'm</TableCell>
                  <TableCell>
                    <div className="flex w-28 items-center gap-2">
                      <Progress value={Math.min(row.conversionRate, 100)} className="h-2" />
                      <span className="text-xs font-medium">{row.conversionRate.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

export default SellerRankingTable;
