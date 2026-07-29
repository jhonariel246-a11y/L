Attribute VB_Name = "modOrdenamiento"
Option Explicit

'====================================================================
'  Modulo de ordenamiento de datos
'  Hoja de trabajo: "Datos"  (fila 1 = encabezados)
'  Autor: generado automaticamente
'====================================================================

Private Const HOJA_DATOS As String = "Datos"

'--- Devuelve el rango de datos incluyendo encabezados -------------
Private Function RangoDatos(ws As Worksheet) As Range
    Dim ultimaFila As Long, ultimaCol As Long
    ultimaFila = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    ultimaCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
    If ultimaFila < 2 Then
        Set RangoDatos = Nothing
    Else
        Set RangoDatos = ws.Range(ws.Cells(1, 1), ws.Cells(ultimaFila, ultimaCol))
    End If
End Function

'--- Ordena por una columna usando el motor nativo de Excel --------
Public Sub OrdenarPorColumna(ByVal indiceColumna As Long, ByVal ascendente As Boolean)
    Dim ws As Worksheet, datos As Range
    Set ws = ThisWorkbook.Worksheets(HOJA_DATOS)
    Set datos = RangoDatos(ws)
    If datos Is Nothing Then
        MsgBox "No hay datos para ordenar.", vbExclamation, "Ordenamiento"
        Exit Sub
    End If
    If indiceColumna < 1 Or indiceColumna > datos.Columns.Count Then
        MsgBox "Columna fuera de rango (1 a " & datos.Columns.Count & ").", _
               vbExclamation, "Ordenamiento"
        Exit Sub
    End If

    With ws.Sort
        .SortFields.Clear
        .SortFields.Add Key:=datos.Columns(indiceColumna), _
                        SortOn:=xlSortOnValues, _
                        Order:=IIf(ascendente, xlAscending, xlDescending), _
                        DataOption:=xlSortNormal
        .SetRange datos
        .Header = xlYes
        .MatchCase = False
        .Orientation = xlTopToBottom
        .Apply
    End With
End Sub

'--- Boton: ordenar de forma ascendente (pregunta la columna) ------
Public Sub OrdenarAscendente()
    PedirColumnaYOrdenar True
End Sub

'--- Boton: ordenar de forma descendente (pregunta la columna) -----
Public Sub OrdenarDescendente()
    PedirColumnaYOrdenar False
End Sub

Private Sub PedirColumnaYOrdenar(ByVal ascendente As Boolean)
    Dim ws As Worksheet, datos As Range
    Dim lista As String, i As Long, resp As String, col As Long
    Set ws = ThisWorkbook.Worksheets(HOJA_DATOS)
    Set datos = RangoDatos(ws)
    If datos Is Nothing Then
        MsgBox "No hay datos para ordenar.", vbExclamation, "Ordenamiento"
        Exit Sub
    End If

    For i = 1 To datos.Columns.Count
        lista = lista & i & " = " & ws.Cells(1, i).Value & vbCrLf
    Next i

    resp = InputBox("Indique el numero de columna a ordenar (" & _
                    IIf(ascendente, "ascendente", "descendente") & "):" & _
                    vbCrLf & vbCrLf & lista, "Ordenar datos", "1")
    If Len(Trim$(resp)) = 0 Then Exit Sub
    If Not IsNumeric(resp) Then
        MsgBox "Debe ingresar un numero.", vbExclamation, "Ordenamiento"
        Exit Sub
    End If
    col = CLng(resp)
    OrdenarPorColumna col, ascendente
End Sub

'--- Ordenamiento manual (algoritmo burbuja) sobre un arreglo ------
'    Se incluye como ejemplo didactico de ordenamiento de datos.
Public Sub OrdenarArregloBurbuja(ByRef arr As Variant, Optional ByVal ascendente As Boolean = True)
    Dim i As Long, j As Long, temp As Variant
    Dim intercambiar As Boolean
    For i = LBound(arr) To UBound(arr) - 1
        For j = LBound(arr) To UBound(arr) - 1 - (i - LBound(arr))
            If ascendente Then
                intercambiar = (arr(j) > arr(j + 1))
            Else
                intercambiar = (arr(j) < arr(j + 1))
            End If
            If intercambiar Then
                temp = arr(j)
                arr(j) = arr(j + 1)
                arr(j + 1) = temp
            End If
        Next j
    Next i
End Sub

'--- Restaura el orden original por la columna "ID" ----------------
Public Sub OrdenarPorID()
    OrdenarPorColumna 1, True
End Sub
