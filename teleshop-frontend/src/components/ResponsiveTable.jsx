import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';

// Mobile Row Component with Expandable Details
const MobileRow = ({ row, columns, onRowClick }) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  // Get the first column as the main identifier
  const mainColumn = columns[0];
  const mainValue = row[mainColumn.key] || 'N/A';

  return (
    <>
      <TableRow 
        hover 
        onClick={() => onRowClick?.(row)}
        sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
      >
        <TableCell>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Stack spacing={0.5}>
            <Typography variant="body2" fontWeight={600}>
              {mainValue}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {columns.slice(1, 3).map((col) => (
                <Chip
                  key={col.key}
                  label={`${col.label}: ${row[col.key] || 'N/A'}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.6rem' }}
                />
              ))}
            </Stack>
          </Stack>
        </TableCell>
        <TableCell align="right">
          {columns.slice(3, 4).map((col) => {
            const value = row[col.key];
            if (col.render) {
              return col.render(value, row);
            }
            return (
              <Typography variant="body2" key={col.key}>
                {value || 'N/A'}
              </Typography>
            );
          })}
        </TableCell>
      </TableRow>
      
      {/* Expandable Details */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={3}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Stack spacing={1.5}>
                {columns.map((col) => (
                  <Box key={col.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="#94a3b8" fontWeight={600}>
                      {col.label}
                    </Typography>
                    <Box>
                      {col.render ? col.render(row[col.key], row) : (
                        <Typography variant="body2" fontWeight={500}>
                          {row[col.key] || 'N/A'}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// Main Responsive Table Component
const ResponsiveTable = ({
  columns,
  data,
  onRowClick,
  actions,
  emptyMessage = 'No data available',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  if (!data || data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="#94a3b8">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  // On mobile/tablet, show fewer columns
  const visibleColumns = isMobile 
    ? columns.slice(0, 3)  // Mobile: show only first 3 columns
    : isTablet 
      ? columns.slice(0, 4)  // Tablet: show first 4 columns
      : columns;  // Desktop: show all columns

  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      {isMobile ? (
        // Mobile View - Card/List Style
        <Box sx={{ p: 1 }}>
          {data.map((row, index) => (
            <Card key={index} sx={{ mb: 1, borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1}>
                  {columns.map((col) => (
                    <Box key={col.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="#94a3b8" fontWeight={600}>
                        {col.label}
                      </Typography>
                      <Box>
                        {col.render ? col.render(row[col.key], row) : (
                          <Typography variant="body2">
                            {row[col.key] || 'N/A'}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                  {actions && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1, pt: 1, borderTop: '1px solid #e2e8f0' }}>
                      {actions(row)}
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        // Tablet/Desktop View - Table Style
        <>
          <Table size={isTablet ? 'small' : 'medium'}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {isTablet && <TableCell sx={{ width: 40 }} />}
                {visibleColumns.map((col) => (
                  <TableCell
                    key={col.key}
                    align={col.align || 'left'}
                    sx={{ 
                      fontWeight: 600, 
                      color: '#475569',
                      fontSize: isTablet ? '0.7rem' : '0.875rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.label}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell align="center" sx={{ fontWeight: 600, color: '#475569' }}>
                    Actions
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, index) => (
                isTablet ? (
                  <MobileRow
                    key={index}
                    row={row}
                    columns={visibleColumns}
                    onRowClick={onRowClick}
                  />
                ) : (
                  <TableRow 
                    hover 
                    onClick={() => onRowClick?.(row)}
                    sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {visibleColumns.map((col) => (
                      <TableCell
                        key={col.key}
                        align={col.align || 'left'}
                        sx={{ fontSize: '0.875rem' }}
                      >
                        {col.render ? col.render(row[col.key], row) : (row[col.key] || 'N/A')}
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          {actions(row)}
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                )
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </TableContainer>
  );
};

export default ResponsiveTable;