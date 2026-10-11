import { useNavigate } from "react-router-dom";
import { MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SellerPerformanceRow {
  sellerId: string;
  sellerName: string;
  totalOrders: number;
  totalSales: number;
  averageCheck: number;
  totalLeads: number;
  conversionRate: number;
  isActive: boolean;
}

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "U";

interface SellerPerformanceTableProps {
  rows: SellerPerformanceRow[];
}

const SellerPerformanceTable = ({ rows }: SellerPerformanceTableProps) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Sotuvchilar natijalari</CardTitle>
          <p className="text-sm text-muted-foreground">Jamoa a'zolari bo'yicha ko'rsatkichlar</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/sellers")}>
          Barchasini ko'rish
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Hali sotuvchilar yo'q</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Sotuvchi</TableHead>
                  <TableHead>Jami zakazlar</TableHead>
                  <TableHead>Jami daromad</TableHead>
                  <TableHead>O'rtacha chek</TableHead>
                  <TableHead>Lidlar</TableHead>
                  <TableHead>Konversiya</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.sellerId}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {initialsOf(row.sellerName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{row.sellerName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{row.totalOrders}</TableCell>
                    <TableCell>{row.totalSales.toLocaleString()} so'm</TableCell>
                    <TableCell>{Math.round(row.averageCheck).toLocaleString()} so'm</TableCell>
                    <TableCell>{row.totalLeads}</TableCell>
                    <TableCell>{row.conversionRate.toFixed(0)}%</TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? "default" : "outline"}>{row.isActive ? "Faol" : "Nofaol"}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate("/all-orders")}>Zakazlarni ko'rish</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate("/sellers")}>Hodimni boshqarish</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
};

export default SellerPerformanceTable;
